import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prebuildDir = {
  'darwin-arm64': 'darwin-arm64',
  'darwin-x64': 'darwin-x64',
  'linux-arm64': 'linux-arm64',
  'linux-x64': 'linux-x64',
}[`${process.platform}-${process.arch}`];

if (!prebuildDir) {
  process.exit(0);
}

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
    console.warn(`node-pty chmod skipped: ${error.message}`);
  }
}