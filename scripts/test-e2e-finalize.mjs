#!/usr/bin/env node
/**
 * E2E finalize — full static validation before iPhone deploy.
 * Usage: pnpm run test:e2e
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { printCatalogSummary, TEST_CATEGORIES } from './test-catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const STEPS = [
  { name: 'Typecheck', cmd: 'pnpm', args: ['run', 'lint'] },
  { name: 'Core suite (test:all)', cmd: 'pnpm', args: ['run', 'test:all'] },
  { name: 'GitHub → iPhone integrity', cmd: 'node', args: ['scripts/test-github-iphone-integrity.mjs'] },
  { name: 'iPhone 17 Air static (#001–#260)', cmd: 'node', args: ['scripts/test-iphone17-air-300.mjs', '--static-only'] },
];

console.log('🏁 Nexify Terminal — E2E Finalize\n');
const summary = printCatalogSummary();
console.log('');

let failed = 0;

for (const step of STEPS) {
  console.log(`\n▶ ${step.name}`);
  console.log('-'.repeat(50));
  const result = spawnSync(step.cmd, step.args, { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    console.error(`\n✗ ${step.name} FAILED (exit ${result.status ?? 1})`);
    failed++;
    break;
  }
}

const numberedCore =
  (TEST_CATEGORIES.find((c) => c.id === 'integrity')?.tests ?? 0) +
  (TEST_CATEGORIES.find((c) => c.id === 'operator')?.tests ?? 0) +
  (TEST_CATEGORIES.find((c) => c.id === 'persona')?.tests ?? 0) +
  (TEST_CATEGORIES.find((c) => c.id === 'operator-ux')?.tests ?? 0);

const e2eStatic =
  numberedCore +
  (TEST_CATEGORIES.find((c) => c.id === 'github-iphone')?.tests ?? 0) +
  (TEST_CATEGORIES.find((c) => c.id === 'iphone17-static')?.tests ?? 0);

console.log('\n' + '='.repeat(54));
console.log('E2E Finalize Summary');
console.log('='.repeat(54));
console.log(`Categories in catalog: ${summary.categories}`);
console.log(`test:all numbered tests: ${numberedCore} (+ security + PIN audits)`);
console.log(`E2E static numbered total: ${e2eStatic} + lint`);
console.log(`iPhone pull-safe categories: ${summary.iphone}`);

if (failed > 0) {
  console.error('\n❌ E2E FINALIZE FAILED');
  process.exit(1);
}

console.log('\n✅ E2E FINALIZE PASSED — safe to deploy / pull on iPhone path');
process.exit(0);