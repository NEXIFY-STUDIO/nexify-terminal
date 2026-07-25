import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve, sep } from 'node:path';

const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_MAX_SESSIONS = 2;
const DEFAULT_INPUT_LIMIT = 4096;
const DEFAULT_ALLOWED_ENV_KEYS = [
  'HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'LOGNAME',
  'PATH',
  'SHELL',
  'TERM',
  'TMPDIR',
  'USER',
];

function normalizeDirList(list = []) {
  return [...new Set(list.filter(Boolean).map((item) => resolve(item)))];
}

function isWithinAllowedPath(candidate, allowedCwds) {
  return allowedCwds.some((allowed) => candidate === allowed || candidate.startsWith(`${allowed}${sep}`));
}

function sanitizeShellEnv(baseEnv = process.env, allowedKeys = DEFAULT_ALLOWED_ENV_KEYS) {
  const nextEnv = {};
  allowedKeys.forEach((key) => {
    if (typeof baseEnv[key] === 'string' && baseEnv[key]) {
      nextEnv[key] = baseEnv[key];
    }
  });
  nextEnv.TERM = nextEnv.TERM || 'xterm-256color';
  nextEnv.LANG = nextEnv.LANG || 'en_US.UTF-8';
  return nextEnv;
}

function resolveRequestedCwd(requestedCwd, allowedCwds) {
  const fallbackCwd = allowedCwds[0];
  const targetCwd = requestedCwd ? resolve(requestedCwd) : fallbackCwd;

  if (!targetCwd || !isWithinAllowedPath(targetCwd, allowedCwds)) {
    throw new Error('Requested cwd is outside the allowed shell paths.');
  }

  return targetCwd;
}

function toSessionSummary(session) {
  return {
    sessionId: session.id,
    mode: session.mode || 'shell',
    cwd: session.cwd,
    shell: session.shellCommand,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    status: session.closed ? 'closed' : 'active',
    cols: session.cols,
    rows: session.rows,
  };
}

// Adapts a node-pty IPty object to the subset of child_process.ChildProcess
// the rest of this module relies on (.stdout/.stderr emitter-likes, .stdin.write,
// .on('exit'/'error'), .kill(signal), and a non-standard .resize(cols, rows)).
function adaptPtyToChild(ptyProc) {
  const stdoutListeners = new Set();
  const exitListeners = new Set();
  const errorListeners = new Set();

  ptyProc.onData?.((data) => {
    stdoutListeners.forEach((cb) => cb(Buffer.from(data, 'utf8')));
  });
  ptyProc.onExit?.(({ exitCode, signal } = {}) => {
    exitListeners.forEach((cb) => cb(exitCode ?? null, signal ?? null));
  });

  return {
    stdout: { on: (event, cb) => { if (event === 'data') stdoutListeners.add(cb); } },
    stderr: { on: () => { } }, // node-pty merges stderr into stdout
    stdin: { write: (data) => ptyProc.write(data) },
    on(event, cb) {
      if (event === 'exit') exitListeners.add(cb);
      else if (event === 'error') errorListeners.add(cb);
    },
    kill(signal) {
      try { ptyProc.kill(signal || 'SIGTERM'); }
      catch (error) { errorListeners.forEach((cb) => cb(error)); }
    },
    resize(cols, rows) {
      try { ptyProc.resize(cols, rows); } catch { /* best effort */ }
    },
  };
}

export function createShellSessionManager({
  spawnProcess = spawn,
  createId = randomUUID,
  now = () => Date.now(),
  baseEnv = process.env,
  shellCommand = process.env.SHELL || '/bin/bash',
  allowedCwds = [process.cwd()],
  idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
  maxSessions = DEFAULT_MAX_SESSIONS,
  inputLimit = DEFAULT_INPUT_LIMIT,
  allowedEnvKeys = DEFAULT_ALLOWED_ENV_KEYS,
  scriptCommand = 'script',
  scriptPlatform = process.platform,
  usePty = true,
  ptyFactory = null,
  copilotCommand = process.env.COPILOT_COMMAND || 'copilot',
  copilotEnvKeys = ['GITHUB_TOKEN', 'GH_TOKEN', 'COPILOT_HOME', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME'],
} = {}) {
  const sessions = new Map();
  const normalizedAllowedCwds = normalizeDirList(allowedCwds);

  if (!normalizedAllowedCwds.length) {
    throw new Error('Shell allowlist is empty.');
  }

  function emit(session, payload) {
    session.listeners.forEach((listener) => listener(payload));
  }

  function touch(session) {
    session.lastActivityAt = now();
  }

  function finalizeSession(session, reason = 'process_exit', details = {}) {
    if (!session || session.closed) return;
    session.closed = true;
    sessions.delete(session.id);
    emit(session, {
      type: 'exit',
      reason,
      code: details.code ?? null,
      signal: details.signal ?? null,
      message: details.message ?? null,
    });
    session.listeners.clear();
  }

  function closeSession(sessionId, reason = 'terminated') {
    const session = sessions.get(sessionId);
    if (!session) return false;
    session.closeReason = reason;

    if (typeof session.child.kill === 'function') {
      try {
        session.child.kill('SIGTERM');
      } catch (err) {
        // ignore
      }
    }

    finalizeSession(session, reason);
    return true;
  }

  function getSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error('Unknown shell session.');
    }
    return session;
  }

  function createSession({ cwd, cols = 120, rows = 32, mode = 'shell' } = {}) {
    if (sessions.size >= maxSessions) {
      const oldestSessionId = [...sessions.keys()][0];
      if (oldestSessionId) {
        closeSession(oldestSessionId, 'max_sessions_reached');
      }
    }
    if (sessions.size >= maxSessions) {
      throw new Error('Maximum active shell sessions reached.');
    }
    if (mode !== 'shell' && mode !== 'copilot') {
      throw new Error('Unsupported session mode.');
    }

    const resolvedCwd = resolveRequestedCwd(cwd, normalizedAllowedCwds);
    const shellEnv = sanitizeShellEnv(baseEnv, allowedEnvKeys);

    if (mode === 'copilot') {
      copilotEnvKeys.forEach((key) => {
        if (typeof baseEnv[key] === 'string' && baseEnv[key]) {
          shellEnv[key] = baseEnv[key];
        }
      });
      shellEnv.FORCE_COLOR = '1';
      shellEnv.CLICOLOR_FORCE = '1';
      shellEnv.COLUMNS = String(cols);
      shellEnv.LINES = String(rows);
    }

    const innerCommand = mode === 'copilot' ? copilotCommand : `${shellCommand} -i`;
    // Three spawn paths in priority order:
    //  1) ptyFactory + usePty=true  → node-pty (true PTY, full TUI support).
    //  2) usePty=true (no factory)  → script(1) wrapper (Linux/BSD argv differ).
    //  3) usePty=false              → /bin/sh -c (no PTY, line-oriented only).
    let child;
    const spawnWithoutPty = () =>
      spawnProcess('/bin/sh', ['-c', innerCommand], {
        cwd: resolvedCwd,
        env: shellEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

    if (usePty && typeof ptyFactory === 'function') {
      try {
        const ptyProc = ptyFactory('/bin/sh', ['-c', innerCommand], {
          name: shellEnv.TERM || 'xterm-256color',
          cols,
          rows,
          cwd: resolvedCwd,
          env: shellEnv,
        });
        child = adaptPtyToChild(ptyProc);
      } catch {
        // Probe can pass while later spawns fail — always keep shell usable.
        child = spawnWithoutPty();
      }
    } else {
      // Pipe mode (deterministic fallback). Skip flaky script(1) on Darwin.
      child = spawnWithoutPty();
    }

    const createdAt = now();
    const session = {
      id: createId(),
      child,
      cwd: resolvedCwd,
      shellCommand: mode === 'copilot' ? copilotCommand : shellCommand,
      mode,
      createdAt,
      lastActivityAt: createdAt,
      listeners: new Set(),
      closed: false,
      closeReason: null,
      cols,
      rows,
    };

    sessions.set(session.id, session);

    const forwardChunk = (chunk, stream = 'stdout') => {
      if (session.closed) return;
      touch(session);
      emit(session, {
        type: 'output',
        stream,
        chunk: chunk.toString('utf8'),
      });
    };

    child.stdout?.on?.('data', (chunk) => forwardChunk(chunk, 'stdout'));
    child.stderr?.on?.('data', (chunk) => forwardChunk(chunk, 'stderr'));

    child.on?.('error', (error) => {
      emit(session, { type: 'error', message: error.message });
      finalizeSession(session, 'spawn_error', { message: error.message });
    });

    child.on?.('exit', (code, signal) => {
      finalizeSession(session, session.closeReason || 'process_exit', { code, signal });
    });

    return toSessionSummary(session);
  }

  function attachListener(sessionId, listener) {
    const session = getSession(sessionId);
    touch(session);
    session.listeners.add(listener);
    listener({
      type: 'ready',
      ...toSessionSummary(session),
      idleTimeoutMs,
      maxSessions,
    });
    return () => {
      session.listeners.delete(listener);
    };
  }

  function writeInput(sessionId, input) {
    const session = getSession(sessionId);
    if (typeof input !== 'string' || !input.length) {
      throw new Error('Shell input must be a non-empty string.');
    }
    if (Buffer.byteLength(input, 'utf8') > inputLimit) {
      throw new Error('Shell input exceeds the maximum payload size.');
    }
    touch(session);
    session.child.stdin?.write?.(input);
    return toSessionSummary(session);
  }

  function resizeSession(sessionId, { cols, rows } = {}) {
    const session = getSession(sessionId);
    if (Number.isFinite(cols)) session.cols = cols;
    if (Number.isFinite(rows)) session.rows = rows;
    if (typeof session.child.resize === 'function') {
      session.child.resize(session.cols, session.rows);
    }
    touch(session);
    return toSessionSummary(session);
  }

  function getSessionInfo(sessionId) {
    return toSessionSummary(getSession(sessionId));
  }

  function sweepIdleSessions() {
    const currentTime = now();
    sessions.forEach((session) => {
      if (currentTime - session.lastActivityAt >= idleTimeoutMs) {
        closeSession(session.id, 'idle_timeout');
      }
    });
  }

  const sweepTimer = setInterval(sweepIdleSessions, Math.max(10_000, Math.floor(idleTimeoutMs / 2)));
  sweepTimer.unref?.();

  return {
    createSession,
    attachListener,
    writeInput,
    resizeSession,
    closeSession,
    getSessionInfo,
    getShellStatus() {
      return {
        enabled: true,
        activeSessions: sessions.size,
        maxSessions,
        idleTimeoutMs,
        allowedCwds: normalizedAllowedCwds,
        shellCommand,
      };
    },
    shutdown() {
      clearInterval(sweepTimer);
      [...sessions.keys()].forEach((sessionId) => closeSession(sessionId, 'shutdown'));
    },
  };
}
