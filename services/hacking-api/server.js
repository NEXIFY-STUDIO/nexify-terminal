// NEXIFY HACKING API — VPS Backend
// Deploy on Ubuntu 22.04, run: node server.js
// Requires: npm install express cors express-rate-limit

import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import os from 'node:os';
import fsPromises from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { executeHackTool } from './executor.js';
import { createShellSessionManager } from './shell.js';

const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:6767';
const API_VERSION = '1.0.0';

// Best-effort node-pty load. When present, the shell manager will spawn child
// processes through a real PTY (required for TUI apps like @github/copilot).
// When absent or broken (missing native binding / posix_spawnp), fall back to
// script(1) or /bin/sh -c so remote shell stays usable.
let ptyFactoryFn = null;
try {
  const require = createRequire(import.meta.url);
  const ptyMod = require('node-pty');
  const spawnFn = ptyMod.spawn || ptyMod.default?.spawn || null;
  if (typeof spawnFn === 'function') {
    // Probe once — a loadable JS wrapper with a broken .node still "requires".
    try {
      const probe = spawnFn('/bin/sh', ['-c', 'exit 0'], {
        name: 'xterm-256color',
        cols: 40,
        rows: 12,
        cwd: process.cwd(),
      });
      try {
        probe.kill();
      } catch {
        // ignore
      }
      ptyFactoryFn = spawnFn;
    } catch (probeErr) {
      console.warn(
        `[hacking-api] node-pty unusable (${probeErr?.message || probeErr}); using non-PTY shell fallback`
      );
      ptyFactoryFn = null;
    }
  }
} catch {
  ptyFactoryFn = null;
}

function getSingleQueryValue(value) {
  if (Array.isArray(value)) return value[0];
  if (typeof value === 'string') return value;
  return undefined;
}

function getExtraArgs(query) {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([key]) => key !== 'target')
      .map(([key, value]) => [key, getSingleQueryValue(value)])
      .filter(([, value]) => value !== undefined)
  );
}

// ── CPU sampling ─────────────────────────────────────────────────────────────
function _cpuTimes() {
  let idle = 0, total = 0;
  for (const { times } of os.cpus()) {
    idle += times.idle;
    total += Object.values(times).reduce((a, b) => a + b, 0);
  }
  return { idle, total };
}
let _prevCpu = _cpuTimes();
let _cachedCpuPct = 0;
setInterval(() => {
  const curr = _cpuTimes();
  const idleDiff = curr.idle - _prevCpu.idle;
  const totalDiff = curr.total - _prevCpu.total;
  _cachedCpuPct = totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : _cachedCpuPct;
  _prevCpu = curr;
}, 1000);

export function createApp({
  apiToken,
  shellToken = process.env.SHELL_TOKEN || '',
  allowedOrigin = DEFAULT_ALLOWED_ORIGIN,
  executeTool = executeHackTool,
  rateLimitWindowMs = 60 * 1000,
  rateLimitMax = 10,
  shellRateLimitMax = Number(process.env.SHELL_RATE_LIMIT_MAX || 600),
  shellManager = shellToken ? createShellSessionManager({
    allowedCwds: (process.env.SHELL_CWD_ALLOWLIST || process.cwd())
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    idleTimeoutMs: Number(process.env.SHELL_IDLE_TIMEOUT_MS || 15 * 60 * 1000),
    maxSessions: Number(process.env.SHELL_MAX_SESSIONS || 8),
    shellCommand: process.env.SHELL_COMMAND || process.env.SHELL || '/bin/bash',
    usePty: process.env.SHELL_USE_PTY ? process.env.SHELL_USE_PTY !== '0' : true,
    ptyFactory: ptyFactoryFn,
  }) : null,
} = {}) {
  if (!apiToken) {
    throw new Error('HACK_API_TOKEN is not set in .env');
  }

  const app = express();
  app.use(express.json({ limit: '8kb' }));

  // ── CORS ──────────────────────────────────────────────────────────────────
  // ALLOWED_ORIGIN can be a single origin or a comma-separated list (e.g.
  // "http://localhost:6767,http://100.103.0.38:6767"). The string "*" allows any.
  const allowedOriginList = Array.isArray(allowedOrigin)
    ? allowedOrigin.map((value) => String(value).trim()).filter(Boolean)
    : String(allowedOrigin || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  const corsOriginOption = allowedOriginList.includes('*')
    ? true
    : (origin, callback) => {
      if (!origin || allowedOriginList.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    };
  app.use(cors({
    origin: corsOriginOption,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Hack-Token', 'X-Shell-Token'],
  }));

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: rateLimitWindowMs,
    max: rateLimitMax,
    message: { error: 'Too many requests. Max 10/minute.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/hack', limiter);

  const shellLimiter = rateLimit({
    windowMs: rateLimitWindowMs,
    max: Math.max(rateLimitMax, shellRateLimitMax),
    message: { error: 'Too many remote shell requests.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/shell', shellLimiter);

  // ── Auth middleware ────────────────────────────────────────────────────────
  function requireToken(req, res, next) {
    const token = req.headers['x-hack-token'];
    if (!token || token !== apiToken) {
      return res.status(401).json({ error: 'Unauthorized. Provide X-Hack-Token header.' });
    }
    next();
  }

  function requireShellToken(req, res, next) {
    if (!shellToken || !shellManager) {
      return res.status(503).json({ error: 'Remote shell is disabled on this server.' });
    }
    const token = req.headers['x-shell-token'];
    if (!token || token !== shellToken) {
      return res.status(401).json({ error: 'Unauthorized. Provide X-Shell-Token header.' });
    }
    next();
  }

  // ── SSE helper ────────────────────────────────────────────────────────────
  function initSSE(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
  }

  function sendSSE(res, data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  function mapShellErrorStatus(error) {
    if (error.message === 'Unknown shell session.') return 404;
    if (error.message === 'Maximum active shell sessions reached.') return 429;
    if (
      error.message === 'Requested cwd is outside the allowed shell paths.' ||
      error.message === 'Shell input must be a non-empty string.' ||
      error.message === 'Shell input exceeds the maximum payload size.' ||
      error.message === 'Unsupported session mode.'
    ) {
      return 400;
    }
    return 500;
  }

  // ── Tool endpoints ─────────────────────────────────────────────────────────
  app.get('/api/hack/:tool', requireToken, async (req, res) => {
    const { tool } = req.params;
    const target = getSingleQueryValue(req.query.target);
    const extra = getExtraArgs(req.query);

    initSSE(res);

    sendSSE(res, { type: 'start', tool, target });

    try {
      await executeTool(tool, target, extra, (line) => {
        sendSSE(res, { type: 'output', line });
      });
      sendSSE(res, { type: 'done' });
    } catch (err) {
      sendSSE(res, { type: 'error', message: err.message });
    }

    res.end();
  });

  // ── Remote shell endpoints ────────────────────────────────────────────────
  app.post('/api/shell/sessions', requireShellToken, (req, res) => {
    try {
      const session = shellManager.createSession({
        cwd: typeof req.body?.cwd === 'string' ? req.body.cwd : undefined,
        cols: Number.isFinite(req.body?.cols) ? req.body.cols : undefined,
        rows: Number.isFinite(req.body?.rows) ? req.body.rows : undefined,
        mode: req.body?.mode === 'copilot' ? 'copilot' : 'shell',
      });
      return res.status(201).json(session);
    } catch (error) {
      return res.status(mapShellErrorStatus(error)).json({ error: error.message });
    }
  });

  app.get('/api/shell/sessions/:sessionId', requireShellToken, (req, res) => {
    try {
      return res.json(shellManager.getSessionInfo(req.params.sessionId));
    } catch (error) {
      return res.status(mapShellErrorStatus(error)).json({ error: error.message });
    }
  });

  app.get('/api/shell/sessions/:sessionId/stream', requireShellToken, (req, res) => {
    initSSE(res);

    let detach = () => { };
    let keepAliveTimer = null;

    try {
      detach = shellManager.attachListener(req.params.sessionId, (event) => {
        sendSSE(res, event);
        if (event.type === 'exit') {
          clearInterval(keepAliveTimer);
          res.end();
        }
      });
    } catch (error) {
      sendSSE(res, { type: 'error', message: error.message });
      return res.end();
    }

    keepAliveTimer = setInterval(() => {
      sendSSE(res, { type: 'keepalive' });
    }, 15_000);
    keepAliveTimer.unref?.();

    req.on('close', () => {
      clearInterval(keepAliveTimer);
      detach();
    });
  });

  app.post('/api/shell/sessions/:sessionId/input', requireShellToken, (req, res) => {
    try {
      const session = shellManager.writeInput(req.params.sessionId, req.body?.input);
      return res.status(202).json({ ok: true, session });
    } catch (error) {
      return res.status(mapShellErrorStatus(error)).json({ error: error.message });
    }
  });

  app.post('/api/shell/sessions/:sessionId/resize', requireShellToken, (req, res) => {
    try {
      const session = shellManager.resizeSession(req.params.sessionId, {
        cols: req.body?.cols,
        rows: req.body?.rows,
      });
      return res.status(202).json({ ok: true, session });
    } catch (error) {
      return res.status(mapShellErrorStatus(error)).json({ error: error.message });
    }
  });

  app.delete('/api/shell/sessions/:sessionId', requireShellToken, (req, res) => {
    const closed = shellManager.closeSession(req.params.sessionId, 'terminated');
    if (!closed) {
      return res.status(404).json({ error: 'Unknown shell session.' });
    }
    return res.status(202).json({ ok: true });
  });

  // ── AI proxy (Ollama + AnythingLLM) ────────────────────────────────────────
  app.get('/api/ai/models', requireToken, async (_req, res) => {
    try {
      const r = await fetch('http://localhost:11434/api/tags');
      const data = await r.json();
      res.json({ models: data.models?.map(m => m.name) || [] });
    } catch {
      res.json({ models: [] });
    }
  });

  app.post('/api/ai/chat', requireToken, async (req, res) => {
    const { model = 'qwen2.5-coder:1.5b-base', messages = [] } = req.body || {};
    initSSE(res);

    try {
      const upstream = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true }),
      });

      if (!upstream.ok) {
        sendSSE(res, { type: 'error', message: `Ollama ${upstream.status}` });
        return res.end();
      }

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              sendSSE(res, { type: 'chunk', content: parsed.message.content });
            }
            if (parsed.done) {
              sendSSE(res, { type: 'done' });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      sendSSE(res, { type: 'error', message: err.message });
    }

    res.end();
  });

  app.post('/api/ai/open-app', requireToken, (req, res) => {
    const { app: appName = 'AnythingLLM' } = req.body || {};
    const safe = appName.replace(/[^a-zA-Z0-9 ]/g, '');
    import('node:child_process').then(({ exec }) => {
      exec(`open -a "${safe}"`, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true });
      });
    }).catch(err => res.status(500).json({ error: err.message }));
  });

  const execAsync = promisify(exec);

  async function getDiskStats() {
    try {
      const stats = await fsPromises.statfs(os.homedir() || '/');
      const total = stats.blocks * stats.bsize;
      const free = stats.bfree * stats.bsize;
      const used = total - free;
      return {
        totalGB: (total / 1e9).toFixed(1),
        usedGB: (used / 1e9).toFixed(1),
        freeGB: (free / 1e9).toFixed(1),
        pct: Math.round((used / total) * 100)
      };
    } catch {
      return { totalGB: '0.0', usedGB: '0.0', freeGB: '0.0', pct: 0 };
    }
  }

  async function getBatteryStats() {
    if (os.platform() !== 'darwin') {
      return { percent: null, status: 'unsupported', isAcConnected: false };
    }
    try {
      const { stdout } = await execAsync('pmset -g batt');
      const pctMatch = stdout.match(/(\d+)%/);
      const stateMatch = stdout.match(/discharging|charging|charged|AC Power/i);
      const isAc = stdout.includes('AC Power') || stdout.includes('AC attached');
      return {
        percent: pctMatch ? parseInt(pctMatch[1], 10) : null,
        status: stateMatch ? stateMatch[0].toLowerCase() : 'unknown',
        isAcConnected: isAc
      };
    } catch {
      return { percent: null, status: 'unknown', isAcConnected: false };
    }
  }

  async function getTopProcesses() {
    try {
      const { stdout } = await execAsync('ps -A -o pid,%cpu,%mem,comm | sort -rn -k 2 | head -n 10');
      const lines = stdout.trim().split('\n');
      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parts[0],
          cpu: parts[1],
          mem: parts[2],
          name: parts.slice(3).join(' ').split('/').pop() || 'unknown'
        };
      });
    } catch {
      return [];
    }
  }

  // ── System info (public — no auth) ─────────────────────────────────────────
  app.get('/sysinfo', async (_req, res) => {
    const ramTotal = os.totalmem();
    const ramFree = os.freemem();
    const ramUsed = ramTotal - ramFree;

    const [disk, battery, processes] = await Promise.all([
      getDiskStats(),
      getBatteryStats(),
      getTopProcesses()
    ]);

    res.json({
      cpuPct: _cachedCpuPct,
      ramPct: Math.round((ramUsed / ramTotal) * 100),
      ramUsedGB: (ramUsed / 1e9).toFixed(1),
      ramTotalGB: (ramTotal / 1e9).toFixed(1),
      disk,
      battery,
      processes
    });
  });

  // ── Health check ───────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => res.json({
    status: 'ok',
    version: API_VERSION,
    shell: shellManager?.getShellStatus?.() || { enabled: false },
  }));

  return app;
}

export function startServer({
  port = process.env.PORT || 3001,
  host = '0.0.0.0',
  apiToken = process.env.HACK_API_TOKEN,
  shellToken = process.env.SHELL_TOKEN || '',
  allowedOrigin = process.env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN,
  executeTool = executeHackTool,
} = {}) {
  const app = createApp({ apiToken, shellToken, allowedOrigin, executeTool });
  return app.listen(port, host, () => {
    console.log(`[nexify-hack-api] Listening on ${host}:${port}`);
    console.log(`[nexify-hack-api] Allowed origin: ${allowedOrigin}`);
  });
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  try {
    startServer();
  } catch (error) {
    console.error(`FATAL: ${error.message} — refusing to start.`);
    process.exit(1);
  }
}
