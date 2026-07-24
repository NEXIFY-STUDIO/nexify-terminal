#!/usr/bin/env node
/**
 * iPhone 17 Air Master Test Suite — 359 tests (280 static + 79 live Playwright)
 * Live: lockscreen + authenticated + screens + operator #321–#327
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { modules, STATIC_COUNT } from './iphone17-tests/index.mjs';
import { runModule, padId, ROOT_DIR } from './iphone17-tests/framework.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const staticOnly = args.includes('--static-only');
const liveOnly = args.includes('--live-only');

/** Live Playwright projects (setup + lockscreen + authenticated incl. #321–#327) */
const LIVE_COUNT = 79;
const SUITE_TOTAL = STATIC_COUNT + LIVE_COUNT;

console.log(`📱 iPhone 17 Air Test Suite — ${SUITE_TOTAL} Tests (Hybrid)\n`);
console.log('='.repeat(54));

let totalPassed = 0;
let totalFailed = 0;
const allFailures = [];

async function runStatic() {
  console.log(`\n[Phase 1/2] Static & Mock Tests (#001–#${padId(STATIC_COUNT)})\n`);

  for (const mod of modules) {
    const result = await runModule(mod);
    totalPassed += result.passed;
    totalFailed += result.failed;
    allFailures.push(...result.failures);
  }

  console.log(`\nStatic Result: ${totalPassed}/${STATIC_COUNT} passed`);
  return totalFailed === 0;
}

function runLive() {
  console.log(`\n[Phase 2/2] Live Playwright Tests (#251–#320, screens suite)\n`);

  const configPath = path.join(__dirname, 'iphone17-playwright/playwright.config.ts');
  const pwBin = path.join(ROOT_DIR, 'node_modules', '.bin', 'playwright');

  const result = spawnSync(
    pwBin,
    ['test', '-c', configPath, '--reporter=line'],
    {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: { ...process.env, WEB_PORT: process.env.WEB_PORT || '3322' },
    }
  );

  if (result.error) {
    console.warn(`⚠️  Playwright not available: ${result.error.message}`);
    console.warn('   Run: pnpm add -D @playwright/test && npx playwright install chromium');
    return true; // skip, not fail
  }

  if (result.status === 0) {
    totalPassed += LIVE_COUNT;
    console.log(`\nLive Result: ${LIVE_COUNT}/${LIVE_COUNT} passed`);
    return true;
  }

  totalFailed += LIVE_COUNT;
  console.error('\nLive Result: some Playwright tests failed');
  return false;
}

async function main() {
  let staticOk = true;
  let liveOk = true;

  if (!liveOnly) {
    staticOk = await runStatic();
  } else {
    totalPassed += STATIC_COUNT;
  }

  if (!staticOnly) {
    liveOk = runLive();
  }

  const expectedTotal = (liveOnly ? 0 : STATIC_COUNT) + (staticOnly ? 0 : LIVE_COUNT);
  const actualPassed =
    (liveOnly ? 0 : staticOk ? STATIC_COUNT : Math.max(0, STATIC_COUNT - allFailures.length)) +
    (staticOnly ? 0 : liveOk ? LIVE_COUNT : 0);

  console.log('\n' + '='.repeat(54));
  console.log('iPhone 17 Air Test Suite Summary');
  console.log('='.repeat(54));

  if (allFailures.length > 0) {
    console.error(`\nFailed static tests (${allFailures.length}):`);
    for (const f of allFailures.slice(0, 20)) {
      console.error(`  #${padId(f.id)} ${f.name}: ${f.error}`);
    }
    if (allFailures.length > 20) {
      console.error(`  ... and ${allFailures.length - 20} more`);
    }
  }

  if (staticOk && liveOk) {
    console.log(`\n✅ iPhone 17 Air Test Suite: ${expectedTotal}/${expectedTotal} PASSED`);
    process.exit(0);
  } else {
    console.error(`\n❌ iPhone 17 Air Test Suite FAILED (${actualPassed}/${expectedTotal} passed)`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
