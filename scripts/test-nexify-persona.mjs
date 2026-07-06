/**
 * Persona tests for unified Nexify megaprompt (decision-tree structure).
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

console.log('🎭 Nexify Persona — 22 tests\n');

await run('01 — Si Nexify, nie chatbot', () => {
  assert(prompt.includes('Si Nexify'), 'missing core identity');
  assert(prompt.includes('Nie si chatbot'), 'missing anti-chatbot rule');
  assert(prompt.includes('Erikovho Macu'), 'missing Mac reference');
});

await run('02 — zákaz corporate opener', () => {
  assert(prompt.includes('Ako vám môžem pomôcť'), 'missing opener ban');
});

await run('03 — SESSION inject — vždy prečítaj prvé', () => {
  assert(prompt.includes('SESSION (injectované appkou'), 'missing SESSION header');
  assert(prompt.includes('live_stack'), 'missing live_stack');
  assert(prompt.includes('last_command'), 'missing last_command');
  assert(prompt.includes('recent_output'), 'missing recent_output');
});

await run('04 — voľný text → max 3 $ príkazy alebo kód', () => {
  assert(prompt.includes('Navrhni max 3 $ príkazy'), 'missing shell suggestion');
  assert(prompt.includes('krátky kód'), 'missing code suggestion');
});

await run('05 — $ alebo / → shell už beží', () => {
  assert(prompt.includes('user poslal $ alebo /'), 'missing shell trigger');
  assert(prompt.includes('Príkaz už beží na Macu'), 'missing execute-mode rule');
});

await run('06 — tón stručný a priamy', () => {
  assert(prompt.includes('stručný, priamy'), 'missing operator tone');
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

await run('11 — tap-to-run v ACTION pravidlách', () => {
  assert(prompt.includes('tap-to-run tlačidlo'), 'missing tap-to-run rule');
  assert(prompt.includes('Max 3 príkazy'), 'missing max commands rule');
});

await run('12 — ACTION ako samostatné $ riadky', () => {
  assert(prompt.includes('samostatné riadky'), 'missing per-line ACTION rule');
  assert(prompt.includes('$ prvý príkaz'), 'missing ACTION example');
});

await run('13 — shell beží → INTENT + RESULT, ACTION prázdne', () => {
  assert(prompt.includes('INTENT + RESULT'), 'missing INTENT+RESULT for shell');
  assert(prompt.includes('ACTION nechaj prázdne'), 'missing empty ACTION rule');
});

await run('14 — SESSION-aware recent_output (500 znakov)', () => {
  assert(prompt.includes('recent_output'), 'missing recent_output');
  assert(prompt.includes('500 znakov'), 'missing output limit');
});

await run('15 — failed_last neopakuje príkaz', () => {
  assert(prompt.includes('failed_last'), 'missing failed_last');
  assert(prompt.includes('neopakuj last_command'), 'missing no-repeat rule');
});

await run('16 — úspešný last_command → ACTION prázdne', () => {
  assert(prompt.includes('failed_last: false'), 'missing success branch');
  assert(prompt.includes('ACTION prázdne'), 'missing empty ACTION on repeat');
});

await run('17 — follow-up po shelli (automaticky)', () => {
  assert(prompt.includes('FOLLOW-UP PO SHELLI'), 'missing follow-up branch');
  assert(prompt.includes('automaticky'), 'missing auto trigger');
});

await run('18 — follow-up stručný na telefóne', () => {
  assert(prompt.includes('user je na telefóne'), 'missing phone context');
});

await run('19 — meta príkaz clear', () => {
  assert(prompt.includes('META PRÍKAZ'), 'missing meta section');
  assert(prompt.includes('clear'), 'missing clear');
  assert(prompt.includes('pamäť vymazaná'), 'missing clear effect');
});

await run('20 — meta príkaz status', () => {
  assert(prompt.includes('status'), 'missing status');
  assert(prompt.includes('health report'), 'missing health report');
});

await run('21 — meta príkazy help a export', () => {
  assert(prompt.includes('help / ? / pomoc'), 'missing help aliases');
  assert(prompt.includes('export'), 'missing export');
  assert(prompt.includes('$ export'), 'missing export shell ban');
});

await run('22 — megaprompt rozhodovací strom A→E', () => {
  assert(prompt.includes('ROZHODOVACÍ STROM'), 'missing decision tree');
  assert(prompt.includes('VOZNÝ VSTUP'), 'missing voice branch');
  assert(prompt.includes('VOĽNÝ TEXT'), 'missing free text branch');
});

console.log('\n==================================================');
console.log(`Nexify Persona: ${passed}/22 passed`);
console.log('==================================================');
process.exit(failed > 0 ? 1 : 0);