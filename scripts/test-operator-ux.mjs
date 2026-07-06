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
import { buildShellFollowUpQuestion } from '../lib/operator/followUpPrompt.mjs';
import {
  isClearSessionCommand,
  clearNexifySessionMemory,
  NEXIFY_MEMORY_STORAGE_KEYS,
} from '../lib/operator/sessionReset.mjs';
import {
  isStatusCommand,
  formatNexifyStatusReport,
} from '../lib/operator/sessionStatus.mjs';
import { isHelpCommand, formatNexifyHelpReport } from '../lib/operator/sessionHelp.mjs';
import {
  detectVoiceSupport,
  resolveSpeechLanguage,
  VOICE_UNAVAILABLE_MESSAGE,
} from '../lib/operator/voiceInput.mjs';
import { NEXIFY_OPERATOR_PROMPT } from '../services/ai-proxy/ai-proxy.mjs';

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

console.log('📱 Nexify Operator UX — 37 tests\n');

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

test('16 — follow-up prompt for success', () => {
  const q = buildShellFollowUpQuestion('ls', { failedLast: false, recentOutput: 'file.txt' });
  assert(q.includes('ls') && q.includes('recent_output'), 'success follow-up');
});

test('17 — follow-up prompt for failure', () => {
  const q = buildShellFollowUpQuestion('badcmd', { failedLast: true, recentOutput: 'zsh: not found' });
  assert(q.includes('failed_last:true') || q.includes('zlyhal'), 'failure follow-up');
});

test('18 — chat-area proactive follow-up after shell', () => {
  const src = fs.readFileSync(chatAreaPath, 'utf8');
  assert(src.includes('sendOperatorFollowUp'), 'missing sendOperatorFollowUp');
  assert(src.includes('pendingShellFollowUpRef'), 'missing pending follow-up ref');
  assert(src.includes('buildShellFollowUpQuestion'), 'missing follow-up prompt import');
});

test('19 — Manuál button a obsah v appke', () => {
  const chat = fs.readFileSync(chatAreaPath, 'utf8');
  const manual = fs.readFileSync(path.join(rootDir, 'components/nexify-manual-sheet.tsx'), 'utf8');
  const content = fs.readFileSync(path.join(rootDir, 'lib/operator/nexifyManualContent.ts'), 'utf8');
  assert(chat.includes('NexifyManualSheet'), 'missing Manuál button in chat-area');
  assert(manual.includes('Nexify Manuál'), 'missing manual sheet title');
  assert(content.includes('MISTRAL_API_KEY_1'), 'missing mistral env docs');
  assert(content.includes('launchctl kickstart'), 'missing restart command');
});

test('20 — isClearSessionCommand exact standalone match', () => {
  assert(isClearSessionCommand('clear'), 'clear');
  assert(isClearSessionCommand('  CLEAR  '), 'case insensitive');
  assert(!isClearSessionCommand('$ clear'), 'no shell prefix');
  assert(!isClearSessionCommand('/clear'), 'no slash prefix');
  assert(!isClearSessionCommand('cleared'), 'no partial match');
});

test('21 — clearNexifySessionMemory wipes chat history key', () => {
  const mock = {
    store: { nexify_chat_history: '[]', nexify_authenticated: 'pin' },
    getItem(key) {
      return this.store[key] ?? null;
    },
    removeItem(key) {
      delete this.store[key];
    },
  };
  const result = clearNexifySessionMemory(mock);
  assert(result.cleared.includes('nexify_chat_history'), 'history cleared');
  assert(mock.getItem('nexify_chat_history') == null, 'history removed');
  assert(mock.getItem('nexify_authenticated') === 'pin', 'auth kept');
  assert(NEXIFY_MEMORY_STORAGE_KEYS.includes('nexify_chat_history'), 'key registered');
});

test('22 — chat-area wires clear session + app restart', () => {
  const src = fs.readFileSync(chatAreaPath, 'utf8');
  assert(src.includes('isClearSessionCommand'), 'missing clear detector');
  assert(src.includes('handleClearSession'), 'missing clear handler');
  assert(src.includes('clearNexifySessionMemory'), 'missing memory wipe');
  assert(src.includes('restartNexifyApp'), 'missing app restart');
});

test('23 — isStatusCommand exact standalone match', () => {
  assert(isStatusCommand('status'), 'status');
  assert(isStatusCommand('  STATUS  '), 'case insensitive');
  assert(!isStatusCommand('$ status'), 'no shell prefix');
  assert(!isStatusCommand('status report'), 'no partial');
});

test('24 — formatNexifyStatusReport includes SESSION fields', () => {
  const report = formatNexifyStatusReport({
    session: { lastCommand: 'df -h', failedLast: true, recentOutput: 'Filesystem' },
    health: { ui: { status: 'ok' }, ai: { status: 'ok', provider: 'mistral' } },
    shellSessionId: 'abc',
    viewMode: 'chat',
    messageCount: 7,
  });
  assert(report.includes('last_command: df -h'), 'last command');
  assert(report.includes('failed_last: true'), 'failed flag');
  assert(report.includes('mistral'), 'ai provider');
  assert(report.includes('clear ='), 'clear tip');
});

test('25 — chat-area wires status report', () => {
  const src = fs.readFileSync(chatAreaPath, 'utf8');
  assert(src.includes('isStatusCommand'), 'missing status detector');
  assert(src.includes('handleStatusReport'), 'missing status handler');
  assert(src.includes('formatNexifyStatusReport'), 'missing status formatter');
});

test('26 — isHelpCommand accepts help ? pomoc', () => {
  assert(isHelpCommand('help'), 'help');
  assert(isHelpCommand('?'), 'question mark');
  assert(isHelpCommand('  POMOC  '), 'pomoc');
  assert(!isHelpCommand('$ help'), 'no shell prefix');
  assert(!isHelpCommand('help me'), 'no partial');
});

test('27 — formatNexifyHelpReport lists operator commands', () => {
  const report = formatNexifyHelpReport();
  assert(report.includes('NEXIFY HELP'), 'header');
  assert(report.includes('status'), 'status cmd');
  assert(report.includes('clear'), 'clear cmd');
  assert(/tap-to-run/i.test(report), 'tap-to-run');
  assert(report.includes('2366'), 'pin');
});

test('28 — chat-area wires help report', () => {
  const src = fs.readFileSync(chatAreaPath, 'utf8');
  assert(src.includes('isHelpCommand'), 'missing help detector');
  assert(src.includes('handleHelpReport'), 'missing help handler');
  assert(src.includes('formatNexifyHelpReport'), 'missing help formatter');
});

test('29 — detectVoiceSupport false without API', () => {
  assert(!detectVoiceSupport({}), 'empty scope');
  assert(!detectVoiceSupport({ window: {} }), 'no recognition ctor');
});

test('30 — detectVoiceSupport true with webkitSpeechRecognition', () => {
  const mock = { webkitSpeechRecognition: function Mock() {} };
  assert(detectVoiceSupport(mock), 'webkit ctor');
  assert(detectVoiceSupport({ window: mock }), 'nested window');
});

test('31 — detectVoiceSupport true with SpeechRecognition', () => {
  const mock = { SpeechRecognition: function Mock() {} };
  assert(detectVoiceSupport(mock), 'standard ctor');
});

test('32 — resolveSpeechLanguage sk-SK', () => {
  assert(resolveSpeechLanguage('sk-SK') === 'sk-SK', 'sk-SK');
  assert(resolveSpeechLanguage('sk') === 'sk-SK', 'sk');
});

test('33 — resolveSpeechLanguage en-US default', () => {
  assert(resolveSpeechLanguage('en-US') === 'en-US', 'en-US');
  assert(resolveSpeechLanguage('de-DE') === 'en-US', 'fallback en');
  assert(resolveSpeechLanguage('') === 'en-US', 'empty');
});

test('34 — voice unavailable message constant', () => {
  assert(
    VOICE_UNAVAILABLE_MESSAGE === 'Voice nie je dostupné na tomto zariadení',
    'toast copy',
  );
});

test('35 — chat-area wires press-and-hold voice input', () => {
  const src = fs.readFileSync(chatAreaPath, 'utf8');
  assert(src.includes('detectVoiceSupport'), 'missing detectVoiceSupport');
  assert(src.includes('createVoiceSession'), 'missing createVoiceSession');
  assert(src.includes('handleMicPointerDown'), 'missing pointer down');
  assert(src.includes('handleMicPointerUp'), 'missing pointer up');
  assert(src.includes('insertVoiceTranscript'), 'missing transcript insert');
  assert(src.includes('VOICE_UNAVAILABLE_MESSAGE'), 'missing fallback toast constant');
  assert(!src.includes('onClick={() => setIsRecording(true)}'), 'stub mic onClick');
});

test('36 — Permissions-Policy allows microphone for PWA voice', () => {
  const nextCfg = fs.readFileSync(path.join(rootDir, 'next.config.mjs'), 'utf8');
  const secHdr = fs.readFileSync(path.join(rootDir, 'lib/security/securityHeaders.ts'), 'utf8');
  assert(nextCfg.includes('microphone=(self)'), 'next.config microphone');
  assert(secHdr.includes('microphone=(self)'), 'securityHeaders microphone');
});

test('37 — NEXIFY_OPERATOR_PROMPT documents voice input', () => {
  assert(NEXIFY_OPERATOR_PROMPT.includes('Voice input'), 'voice section');
  assert(NEXIFY_OPERATOR_PROMPT.includes('press-and-hold'), 'hold hint');
  assert(NEXIFY_OPERATOR_PROMPT.includes('nie auto-send'), 'no auto-send');
});

console.log('\n==================================================');
console.log(`Operator UX: ${passed}/37 passed`);
console.log('==================================================');
process.exit(failed > 0 ? 1 : 0);