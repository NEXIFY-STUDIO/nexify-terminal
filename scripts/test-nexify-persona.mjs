/**
 * 10 focused tests for polished Nexify persona prompt.
 */
import { NEXIFY_OPERATOR_PROMPT, formatQuestionWithContext, getAiProxyConfig } from '../services/ai-proxy/ai-proxy.mjs';

const prompt = NEXIFY_OPERATOR_PROMPT;
let passed = 0;
let failed = 0;

async function run(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log('🎭 Nexify Persona — 10 tests\n');

await run('01 — Si Nexify, nie chatbot', () => {
  assert(prompt.includes('Si Nexify — nie chatbot'), 'missing core identity');
  assert(prompt.includes('rozhranie k Erikovmu Macu'), 'missing Mac interface');
});

await run('02 — zákaz „Ako vám môžem pomôcť?“', () => {
  assert(prompt.includes('Nikdy nezačínaj „Ako vám môžem pomôcť?“'), 'missing opener ban');
});

await run('03 — začína stavom zo SESSION', () => {
  assert(prompt.includes('Začni stavom zo SESSION'), 'missing SESSION start rule');
  assert(prompt.includes('live_stack'), 'missing live_stack reference');
  assert(prompt.includes('last_command'), 'missing last_command reference');
});

await run('04 — text → shell alebo kód', () => {
  assert(prompt.includes('navrhni shell príkaz'), 'missing shell suggestion rule');
  assert(prompt.includes('konkrétny kód'), 'missing code suggestion rule');
});

await run('05 — $ alebo / → vykonávanie, nie rady', () => {
  assert(prompt.includes('Keď user píše $ alebo /'), 'missing shell trigger');
  assert(prompt.includes('neradíš'), 'missing no-advice rule for shell');
});

await run('06 — tón stručný operátor', () => {
  assert(prompt.includes('stručný operátor'), 'missing operator tone');
  assert(prompt.includes('nie asistent z call centra'), 'missing anti-callcenter tone');
});

await run('07 — INTENT / ACTION / RESULT formát', () => {
  assert(prompt.includes('INTENT:'), 'missing INTENT');
  assert(prompt.includes('ACTION:'), 'missing ACTION');
  assert(prompt.includes('RESULT:'), 'missing RESULT');
});

await run('08 — default config používa NEXIFY_OPERATOR_PROMPT', () => {
  const cfg = getAiProxyConfig({ AI_PROVIDER: 'mistral', MISTRAL_API_KEY: 'x' });
  assert(cfg.systemPrompt === NEXIFY_OPERATOR_PROMPT, 'config systemPrompt mismatch');
});

await run('09 — SESSION blok mapuje stav pre prompt', () => {
  const out = formatQuestionWithContext('status?', {
    workspaceRoot: '/Users/erikbabcan',
    stack: 'Nexify :3322',
    lastCommand: 'git status',
  });
  assert(out.includes('workspace: /Users/erikbabcan'), 'workspace missing');
  assert(out.includes('live_stack: Nexify :3322'), 'stack missing');
  assert(out.includes('last_command: git status'), 'last command missing');
});

await run('10 — žiadna stará TECH CENTER persona', () => {
  assert(!prompt.includes('NEXIFY TECH CENTER'), 'legacy persona leaked');
  assert(!prompt.includes('EXCLUSIVELY in the Slovak'), 'legacy language lock leaked');
});

console.log('\n==================================================');
console.log(`Nexify Persona: ${passed}/10 passed`);
console.log('==================================================');
process.exit(failed > 0 ? 1 : 0);