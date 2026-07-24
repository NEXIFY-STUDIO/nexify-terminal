/**
 * postinstall: ensure node-pty is executable and can spawn.
 * On failure: one rebuild attempt, then warn and exit 0 (runtime falls back to pipe).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const prebuildDir = {
  'darwin-arm64': 'darwin-arm64',
  'darwin-x64': 'darwin-x64',
  'linux-arm64': 'linux-arm64',
  'linux-x64': 'linux-x64',
}[`${process.platform}-${process.arch}`];

function chmodSpawnHelper() {
  if (!prebuildDir) return;
  const spawnHelper = path.join(
    root,
    'node_modules',
    'node-pty',
    'prebuilds',
    prebuildDir,
    'spawn-helper'
  );
  try {
    fs.chmodSync(spawnHelper, 0o755);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[ensure-node-pty] chmod skipped: ${error.message}`);
    }
  }
}

function probePty() {
  const ptyMod = require('node-pty');
  const spawnFn = ptyMod.spawn || ptyMod.default?.spawn;
  if (typeof spawnFn !== 'function') {
    throw new Error('node-pty.spawn missing');
  }
  const probe = spawnFn('/bin/sh', ['-c', 'exit 0'], {
    name: 'xterm-256color',
    cols: 40,
    rows: 12,
    cwd: root,
  });
  try {
    probe.kill();
  } catch {
    // ignore
  }
}

function rebuildPty() {
  console.warn('[ensure-node-pty] probe failed — attempting npm rebuild node-pty');
  const result = spawnSync('npm', ['rebuild', 'node-pty'], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  });
  if (result.status !== 0) {
    console.warn(
      `[ensure-node-pty] rebuild failed: ${result.stderr || result.stdout || result.status}`
    );
  }
}

chmodSpawnHelper();

try {
  probePty();
  console.warn('[ensure-node-pty] node-pty probe ok');
  process.exit(0);
} catch (firstErr) {
  console.warn(`[ensure-node-pty] first probe failed: ${firstErr?.message || firstErr}`);
  rebuildPty();
  chmodSpawnHelper();
  try {
    probePty();
    console.warn('[ensure-node-pty] node-pty probe ok after rebuild');
    process.exit(0);
  } catch (secondErr) {
    console.warn(
      `[ensure-node-pty] still unusable (${secondErr?.message || secondErr}); runtime will use pipe fallback`
    );
    process.exit(0);
  }
}
