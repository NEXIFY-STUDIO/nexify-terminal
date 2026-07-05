import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractShellCommands, normalizeShellInput } from '../lib/operator/shellCommands.mjs';
import {
  detectInputMode,
  getInputPlaceholder,
  getInputModeLabel,
  cycleInputMode,
  applyInputModePrefix,
} from '../lib/operator/inputMode.mjs';
import {
  buildSessionFields,
  detectFailedLast,
  getRecentOutputFromMessages,
} from '../lib/operator/sessionContext.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const chatAreaPath = path.join(rootDir, 'components/chat-area.tsx');

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

console.log('📱 Nexify Operator UX — 15 tests\n');

test('01 — extract single $ line', () => {
  assert(
    extractShellCommands('INTENT: check disk\n$ df -h\nRESULT: table').join('|') === 'df -h',
    'expected df -h',
  );
});

test('02 — extract ACTION: $ block', () => {
  const cmds = extractShellCommands('ACTION: $ git status\nRESULT: branch info');
  assert(cmds.length === 1 && cmds[0] === 'git status', `got ${cmds.join(',')}`);
});

test('03 — dedupe duplicate commands', () => {
  const cmds = extractShellCommands('$ ls\n$ ls\nACTION: $ ls');
  assert(cmds.length === 1, `expected 1, got ${cmds.length}`);
});

test('04 — multiple distinct commands preserve order', () => {
  const cmds = extractShellCommands('$ pwd\n$ ls -la');
  assert(cmds.join('|') === 'pwd|ls -la', cmds.join('|'));
});

test('05 — normalizeShellInput strips $ and /', () => {
  assert(normalizeShellInput('$  git status  ') === 'git status', 'strip $');
  assert(normalizeShellInput('/ npm test') === 'npm test', 'strip /');
});

test('06 — detectInputMode for $ / and text', () => {
  assert(detectInputMode('$ ls') === 'shell', 'shell');
  assert(detectInputMode('/pwd') === 'slash', 'slash');
  assert(detectInputMode('show disk') === 'ai', 'ai');
});

test('07 — placeholders per mode', () => {
  assert(getInputPlaceholder('shell').includes('$'), 'shell ph');
  assert(getInputPlaceholder('ai').includes('Nexify'), 'ai ph');
});

test('08 — mode label and cycle', () => {
  assert(getInputModeLabel('shell') === '$', 'label shell');
  assert(cycleInputMode('ai') === 'shell', 'cycle ai→shell');
  assert(cycleInputMode('slash') === 'ai', 'cycle slash→ai');
});

test('09 — applyInputModePrefix', () => {
  assert(applyInputModePrefix('git status', 'shell') === '$ git status', 'prefix shell');
  assert(applyInputModePrefix('$ ls', 'ai') === 'ls', 'strip for ai');
});

test('10 — chat-area wires tap-to-run and input mode', () => {
  const src = fs.readFileSync(chatAreaPath, 'utf8');
  assert(src.includes('extractShellCommands'), 'missing extractShellCommands');
  assert(src.includes('detectInputMode'), 'missing detectInputMode');
  assert(src.includes('ShellCommandChips'), 'missing ShellCommandChips');
  assert(src.includes('operator-status'), 'missing status strip');
});

test('11 — recent_output truncated to 500 chars', () => {
  const long = 'x'.repeat(600);
  const out = getRecentOutputFromMessages([{ type: 'output', content: long }]);
  assert(out?.length === 500, `expected 500, got ${out?.length}`);
  assert(out?.endsWith('x'), 'should keep tail');
});

test('12 — detectFailedLast catches zsh error', () => {
  assert(detectFailedLast('zsh: command not found: foobar'), 'zsh fail');
  assert(!detectFailedLast('Everything OK\nDone.'), 'ok output');
});

test('13 — buildSessionFields maps command + failure', () => {
  const session = buildSessionFields([
    { type: 'command', content: 'badcmd' },
    { type: 'output', content: 'zsh: command not found: badcmd' },
  ]);
  assert(session.lastCommand === 'badcmd', 'last command');
  assert(session.failedLast === true, 'failed flag');
  assert(session.recentOutput?.includes('command not found'), 'recent output');
});

test('14 — chat-area sends recentOutput and failedLast', () => {
  const src = fs.readFileSync(chatAreaPath, 'utf8');
  assert(src.includes('buildSessionFields'), 'missing buildSessionFields');
  assert(src.includes('recentOutput'), 'missing recentOutput in context');
  assert(src.includes('failedLast'), 'missing failedLast in context');
});

test('15 — status strip shows failed indicator', () => {
  const src = fs.readFileSync(chatAreaPath, 'utf8');
  assert(src.includes('sessionFields.failedLast'), 'missing failed badge');
});

console.log('\n==================================================');
console.log(`Operator UX: ${passed}/15 passed`);
console.log('==================================================');
process.exit(failed > 0 ? 1 : 0);