// NEXIFY HACKING API — Tool Executor (allowlist-based, no arbitrary shell)
// Uses child_process.spawn — never exec() to prevent shell injection

import { spawn } from 'child_process';

// ── Input validators ──────────────────────────────────────────────────────────
const HOSTNAME_RE = /^[a-zA-Z0-9._-]{1,253}$/;
const IP_RE = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
const URL_RE = /^https?:\/\/[a-zA-Z0-9._:/?&=%#~+-]{1,500}$/;
const PORT_RE = /^\d{1,5}(-\d{1,5})?$/;
const WORDLIST_RE = /^[a-zA-Z0-9._/-]{1,200}$/;
const SERVICE_RE = /^(ssh|ftp|http|https|smtp|mysql|rdp|vnc|telnet)$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]{1,64}$/;

function isValidTarget(target) {
  return target && (HOSTNAME_RE.test(target) || IP_RE.test(target));
}

function isValidUrl(url) {
  return url && URL_RE.test(url);
}

// ── Tool definitions ──────────────────────────────────────────────────────────
// Each tool returns: { bin, args(target, extra) } or throws on invalid input
export const TOOLS = {
  nmap: {
    timeout: 120000,
    build(target, extra) {
      if (!isValidTarget(target)) throw new Error(`Invalid target: ${target}`);
      const ports = extra?.ports && PORT_RE.test(extra.ports) ? ['-p', extra.ports] : [];
      return { bin: 'nmap', args: ['-sV', '-sC', '-T4', '--open', ...ports, target] };
    },
  },
  whois: {
    timeout: 15000,
    build(target) {
      if (!isValidTarget(target)) throw new Error(`Invalid domain: ${target}`);
      return { bin: 'whois', args: [target] };
    },
  },
  dig: {
    timeout: 10000,
    build(target, extra) {
      if (!isValidTarget(target)) throw new Error(`Invalid domain: ${target}`);
      const type = ['A', 'MX', 'NS', 'TXT', 'AAAA'].includes(extra?.type) ? extra.type : 'ANY';
      return { bin: 'dig', args: [type, target, '+noall', '+answer'] };
    },
  },
  nikto: {
    timeout: 120000,
    build(target) {
      if (!isValidUrl(target)) throw new Error(`Invalid URL: ${target}`);
      return { bin: 'nikto', args: ['-h', target, '-nointeractive'] };
    },
  },
  gobuster: {
    timeout: 120000,
    build(target, extra) {
      if (!isValidUrl(target)) throw new Error(`Invalid URL: ${target}`);
      const wordlist = extra?.wordlist && WORDLIST_RE.test(extra.wordlist)
        ? extra.wordlist
        : '/usr/share/wordlists/dirb/common.txt';
      return {
        bin: 'gobuster',
        args: ['dir', '-u', target, '-w', wordlist, '-q', '--no-error', '-t', '20'],
      };
    },
  },
  ffuf: {
    timeout: 120000,
    build(target, extra) {
      if (!isValidUrl(target)) throw new Error(`Invalid URL (must contain FUZZ): ${target}`);
      if (!target.includes('FUZZ')) throw new Error('URL must contain FUZZ placeholder');
      const wordlist = extra?.wordlist && WORDLIST_RE.test(extra.wordlist)
        ? extra.wordlist
        : '/usr/share/wordlists/dirb/common.txt';
      return { bin: 'ffuf', args: ['-u', target, '-w', wordlist, '-mc', '200,301,302,403'] };
    },
  },
  sqlmap: {
    timeout: 180000,
    build(target, extra) {
      if (!isValidUrl(target)) throw new Error(`Invalid URL: ${target}`);
      const level = Math.min(parseInt(extra?.level, 10) || 1, 2); // cap at level 2
      return {
        bin: 'sqlmap',
        args: ['-u', target, '--batch', '--level', String(level), '--risk', '1', '--disable-coloring'],
      };
    },
  },
  hydra: {
    timeout: 180000,
    build(target, extra) {
      if (!isValidTarget(target)) throw new Error(`Invalid target: ${target}`);
      if (!extra?.service || !SERVICE_RE.test(extra.service)) throw new Error('Invalid or missing service');
      if (!extra?.username || !USERNAME_RE.test(extra.username)) throw new Error('Invalid username');
      // rockyou.txt ships gzipped on Ubuntu 22 — use a smaller plain-text list as default.
      // Users can pass extra.wordlist to override.
      const wordlist = extra?.wordlist && WORDLIST_RE.test(extra.wordlist)
        ? extra.wordlist
        : '/usr/share/wordlists/metasploit/unix_passwords.txt';
      return {
        bin: 'hydra',
        args: ['-l', extra.username, '-P', wordlist, '-w', '3', '-t', '4', '-f', target, extra.service],
      };
    },
  },
  curl: {
    timeout: 15000,
    build(target) {
      if (!isValidUrl(target)) throw new Error(`Invalid URL: ${target}`);
      return { bin: 'curl', args: ['-s', '-I', '--max-time', '10', target] };
    },
  },
  'openssl-tls': {
    timeout: 15000,
    build(target) {
      if (!isValidTarget(target)) throw new Error(`Invalid host: ${target}`);
      const [host, port = '443'] = target.split(':');
      if (!PORT_RE.test(port)) throw new Error('Invalid port');
      return {
        bin: 'openssl',
        args: ['s_client', '-connect', `${host}:${port}`, '-brief'],
      };
    },
  },
};

// ── Executor ──────────────────────────────────────────────────────────────────
export function createHackToolExecutor({
  spawnImpl = spawn,
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
} = {}) {
  return function executeHackTool(toolName, target, extra = {}, onLine = () => {}) {
    return new Promise((resolve, reject) => {
      const toolDef = TOOLS[toolName];
      if (!toolDef) return reject(new Error(`Unknown tool: ${toolName}`));

      let cmd;
      try {
        cmd = toolDef.build(target, extra);
      } catch (validationError) {
        return reject(validationError);
      }

      const child = spawnImpl(cmd.bin, cmd.args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false, // CRITICAL: never use shell: true
        timeout: toolDef.timeout,
      });

      let killed = false;
      const killTimer = setTimeoutImpl(() => {
        killed = true;
        child.kill('SIGKILL');
        reject(new Error(`Timeout: ${toolName} exceeded ${toolDef.timeout / 1000}s`));
      }, toolDef.timeout);

      child.stdout?.setEncoding?.('utf8');
      child.stderr?.setEncoding?.('utf8');

      // Stream stdout line-by-line
      let buffer = '';
      child.stdout?.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete last line
        lines.forEach((line) => onLine(line));
      });

      // Stderr shown as warning lines
      child.stderr?.on('data', (chunk) => {
        chunk.split('\n').filter(Boolean).forEach((line) => onLine(`[stderr] ${line}`));
      });

      child.on('close', (code) => {
        clearTimeoutImpl(killTimer);
        if (killed) return;
        if (buffer) onLine(buffer); // flush remaining
        if (code !== 0 && code !== null) {
          onLine(`[exit code: ${code}]`);
        }
        resolve();
      });

      child.on('error', (err) => {
        clearTimeoutImpl(killTimer);
        reject(new Error(`Failed to start ${cmd.bin}: ${err.message}`));
      });
    });
  };
}

export const executeHackTool = createHackToolExecutor();
