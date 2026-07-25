/**
 * Resolve shell PTY factory deterministically.
 *
 * Modes (logged at boot):
 *   - pty   — node-pty spawn works (probe passed)
 *   - pipe  — /bin/sh -c fallback (SHELL_USE_PTY=0 or probe failed)
 *
 * SHELL_USE_PTY:
 *   - "0" / "false" → skip pty load entirely (pipe)
 *   - "1" / unset   → try node-pty + one-shot spawn probe
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);

/**
 * @returns {{
 *   mode: 'pty' | 'pipe';
 *   ptyFactory: ((file: string, args: string[], opts: object) => unknown) | null
 *   reason: string
 * }}
 */
export function resolveShellPty() {
  const flag = String(process.env.SHELL_USE_PTY ?? '1').trim().toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'no' || flag === 'off') {
    return {
      mode: 'pipe',
      ptyFactory: null,
      reason: 'SHELL_USE_PTY disabled',
    };
  }

  let spawnFn = null;
  try {
    const ptyMod = require('node-pty');
    spawnFn = ptyMod.spawn || ptyMod.default?.spawn || null;
  } catch (err) {
    return {
      mode: 'pipe',
      ptyFactory: null,
      reason: `node-pty require failed: ${err?.message || err}`,
    };
  }

  if (typeof spawnFn !== 'function') {
    return {
      mode: 'pipe',
      ptyFactory: null,
      reason: 'node-pty.spawn missing',
    };
  }

  // One-shot probe — JS wrapper can load while native spawn is broken (posix_spawnp).
  try {
    const probeCwd = path.dirname(fileURLToPath(import.meta.url));
    const probe = spawnFn('/bin/sh', ['-c', 'exit 0'], {
      name: 'xterm-256color',
      cols: 40,
      rows: 12,
      cwd: probeCwd,
    });
    try {
      probe.kill();
    } catch {
      // ignore
    }
    return {
      mode: 'pty',
      ptyFactory: spawnFn,
      reason: 'node-pty probe ok',
    };
  } catch (probeErr) {
    return {
      mode: 'pipe',
      ptyFactory: null,
      reason: `node-pty probe failed: ${probeErr?.message || probeErr}`,
    };
  }
}
