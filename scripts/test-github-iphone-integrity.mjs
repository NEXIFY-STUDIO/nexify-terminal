#!/usr/bin/env node
/**
 * GitHub Pull → iPhone 17 Air integrity checks.
 * Run after: git pull origin main && pnpm install
 * Safe on Mac CI and on-device pull workflow (no live :3322 required).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TEST_CATEGORIES,
  IPHONE17_STATIC_MODULES,
  categoriesForIphonePull,
} from './test-catalog.mjs';
import { NEXIFY_OPERATOR_PROMPT } from '../services/ai-proxy/ai-proxy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function read(rel) {
  const full = path.join(ROOT, rel);
  assert(fs.existsSync(full), `missing ${rel}`);
  return fs.readFileSync(full, 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

console.log('📲 GitHub Pull → iPhone 17 Air Integrity — 35 tests\n');

test('01 — package.json defines test:all', () => {
  const pkg = JSON.parse(read('package.json'));
  assert(pkg.scripts['test:all'], 'test:all missing');
  assert(pkg.scripts['test:iphone17-static'], 'test:iphone17-static missing');
});

test('02 — package.json defines test:github-iphone', () => {
  const pkg = JSON.parse(read('package.json'));
  assert(pkg.scripts['test:github-iphone'], 'test:github-iphone missing');
});

test('03 — CI workflow runs test:all', () => {
  const ci = read('.github/workflows/ci.yml');
  assert(ci.includes('pnpm run test:all'), 'CI missing test:all');
});

test('04 — README documents iPhone URL :3322', () => {
  const readme = read('README.md');
  assert(readme.includes('100.103.0.38:3322') || readme.includes(':3322'), 'README missing UI port');
});

test('05 — iPhone 17 master runner exists', () => {
  assert(exists('scripts/test-iphone17-air-300.mjs'), 'missing iphone17 runner');
});

test('06 — all 8 iPhone static modules present', () => {
  for (const mod of IPHONE17_STATIC_MODULES) {
    assert(exists(`scripts/iphone17-tests/${mod}.mjs`), `missing module ${mod}`);
  }
});

test('07 — iPhone Playwright config present', () => {
  assert(exists('scripts/iphone17-playwright/playwright.config.ts'), 'missing playwright config');
  assert(exists('scripts/iphone17-playwright/device-profile.ts'), 'missing device profile');
});

test('08 — operator lib modules v1–v10', () => {
  const modules = [
    'lib/operator/shellCommands.mjs',
    'lib/operator/inputMode.mjs',
    'lib/operator/sessionContext.mjs',
    'lib/operator/sessionReset.mjs',
    'lib/operator/sessionStatus.mjs',
    'lib/operator/sessionHelp.mjs',
    'lib/operator/followUpPrompt.mjs',
    'lib/operator/voiceInput.mjs',
    'lib/operator/sessionExport.mjs',
    'lib/operator/nexifyManualContent.ts',
  ];
  for (const m of modules) assert(exists(m), `missing ${m}`);
});

test('09 — megaprompt decision tree in ai-proxy', () => {
  assert(NEXIFY_OPERATOR_PROMPT.includes('ROZHODOVACÍ STROM'), 'missing decision tree');
  assert(NEXIFY_OPERATOR_PROMPT.includes('META PRÍKAZ'), 'missing meta branch');
  assert(NEXIFY_OPERATOR_PROMPT.includes('VOZNÝ VSTUP'), 'missing voice branch');
});

test('10 — megaprompt export + meta bans', () => {
  assert(NEXIFY_OPERATOR_PROMPT.includes('export'), 'missing export');
  assert(NEXIFY_OPERATOR_PROMPT.includes('$ export'), 'missing export shell ban');
  assert(NEXIFY_OPERATOR_PROMPT.includes('PIN'), 'missing PIN ban');
});

test('11 — chat-area wires operator v1–v10', () => {
  const chat = read('components/chat-area.tsx');
  assert(chat.includes('handleSend'), 'missing handleSend');
  assert(chat.includes('isClearSessionCommand'), 'missing clear');
  assert(chat.includes('isStatusCommand'), 'missing status');
  assert(chat.includes('isHelpCommand'), 'missing help');
  assert(chat.includes('isExportSessionCommand'), 'missing export');
  assert(chat.includes('handleMicPointerDown'), 'missing voice');
  assert(chat.includes('formatSessionMarkdown'), 'missing markdown export');
});

test('12 — PWA manifest + service worker files', () => {
  assert(exists('public/manifest.json'), 'missing manifest.json');
  assert(exists('public/sw.js'), 'missing sw.js');
  assert(exists('public/icons/icon-1024x1024.png'), 'missing app icon');
});

test('13 — layout viewport for iPhone', () => {
  const layout = read('app/layout.tsx');
  assert(/viewportFit:\s*"cover"/.test(layout), 'missing viewportFit cover');
  assert(/userScalable:\s*false/.test(layout), 'missing userScalable false');
});

test('14 — safe-area CSS variables', () => {
  const css = read('app/globals.css');
  assert(css.includes('safe-area-inset-top'), 'missing safe-area top');
  assert(css.includes('safe-area-inset-bottom'), 'missing safe-area bottom');
});

test('15 — microphone allowed for voice v9', () => {
  const next = read('next.config.mjs');
  const sec = read('lib/security/securityHeaders.ts');
  assert(next.includes('microphone=(self)'), 'next.config microphone');
  assert(sec.includes('microphone=(self)'), 'securityHeaders microphone');
});

test('16 — Tailscale proxy lock', () => {
  const proxy = read('proxy.ts');
  assert(/tailscaleAllowedIp/i.test(proxy), 'missing tailscale lock');
  assert(proxy.includes('100.'), 'missing 100.x allow');
});

test('17 — health endpoint for phone status', () => {
  assert(exists('app/api/health/route.ts'), 'missing health route');
});

test('18 — shell API for tap-to-run', () => {
  assert(exists('app/api/shell/route.ts'), 'missing shell route');
});

test('19 — AI proxy service', () => {
  assert(exists('services/ai-proxy/ai-proxy.mjs'), 'missing ai-proxy');
});

test('20 — dev-all launch script', () => {
  assert(exists('scripts/dev-all.sh'), 'missing dev-all.sh');
});

test('21 — test catalog registry', () => {
  assert(exists('scripts/test-catalog.mjs'), 'missing test-catalog');
  assert(TEST_CATEGORIES.length >= 12, 'catalog too small');
});

test('22 — iPhone pull categories include github-iphone', () => {
  const ids = categoriesForIphonePull().map((c) => c.id);
  assert(ids.includes('github-iphone'), 'github-iphone not in pull set');
  assert(ids.includes('iphone17-static'), 'iphone17-static not in pull set');
  assert(ids.includes('operator-ux'), 'operator-ux not in pull set');
});

test('23 — export redaction module', () => {
  const exp = read('lib/operator/sessionExport.mjs');
  assert(exp.includes('redactExportSecrets'), 'missing redact');
  assert(exp.includes('formatSessionMarkdown'), 'missing formatter');
  assert(exp.includes('deliverSessionMarkdown'), 'missing deliver');
});

test('24 — voice detect module', () => {
  const voice = read('lib/operator/voiceInput.mjs');
  assert(voice.includes('detectVoiceSupport'), 'missing detectVoiceSupport');
  assert(voice.includes('resolveSpeechLanguage'), 'missing language resolver');
});

test('25 — NexifyManualSheet in UI', () => {
  assert(exists('components/nexify-manual-sheet.tsx'), 'missing manual sheet');
  assert(read('components/chat-area.tsx').includes('NexifyManualSheet'), 'manual not wired');
});

test('26 — PIN auth guard component', () => {
  assert(exists('components/auth-guard.tsx'), 'missing auth-guard');
});

test('27 — .env.example present (no secrets)', () => {
  assert(exists('.env.example'), 'missing .env.example');
  const example = read('.env.example');
  assert(!example.includes('sk-'), 'example must not contain real keys');
});

test('28 — .env.ci for GitHub Actions', () => {
  assert(exists('.env.ci'), 'missing .env.ci');
});

test('29 — operator UX test count ≥ 48', () => {
  const ux = read('scripts/test-operator-ux.mjs');
  assert(/48 tests/.test(ux), 'operator UX test header outdated');
});

test('30 — persona test count ≥ 22', () => {
  const persona = read('scripts/test-nexify-persona.mjs');
  assert(/22 tests/.test(persona), 'persona test header outdated');
});

test('31 — integrity suite count ≥ 75', () => {
  const integrity = read('scripts/test-integrity-suite.mjs');
  assert(/75 Assertions/.test(integrity), 'integrity count outdated');
});

test('32 — iPhone index validates 250 static', () => {
  const idx = read('scripts/iphone17-tests/index.mjs');
  assert(idx.includes('STATIC_COUNT !== 250'), 'missing 250 guard');
});

test('33 — playwright iPhone device profile', () => {
  const profile = read('scripts/iphone17-playwright/device-profile.ts');
  assert(profile.includes('iPhone') || profile.includes('390'), 'missing iPhone dimensions');
});

test('34 — README and iPhone 17 Air docs', () => {
  const readme = read('README.md');
  assert(readme.includes('test:all'), 'README missing test:all');
  assert(readme.includes('test:e2e'), 'README missing test:e2e');
  assert(readme.includes('IPHONE17_AIR_PROMPT'), 'README missing iPhone prompt section');
  assert(exists('IPHONE17_AIR_PROMPT.md'), 'missing IPHONE17_AIR_PROMPT.md');
  assert(exists('MOBILE_TESTING_GUIDE.md'), 'missing MOBILE_TESTING_GUIDE.md');
  const prompt = read('IPHONE17_AIR_PROMPT.md');
  const block = prompt.match(/```\n([\s\S]*?)\n```/)?.[1] ?? '';
  assert(block.length >= 1900 && block.length <= 2100, `prompt length ${block.length}, expected ~2000`);
});

test('35 — git remote origin points to nexify-terminal', () => {
  if (!exists('.git/config')) return;
  const gitConfig = read('.git/config');
  assert(
    gitConfig.includes('nexify-terminal') || gitConfig.includes('NEXIFY-STUDIO'),
    'origin should be nexify-terminal repo',
  );
});

console.log('\n==================================================');
console.log(`GitHub → iPhone Integrity: ${passed}/35 passed`);
console.log('==================================================');
process.exit(failed > 0 ? 1 : 0);