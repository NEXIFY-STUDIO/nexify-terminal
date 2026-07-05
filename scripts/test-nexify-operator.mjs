import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NEXIFY_OPERATOR_PROMPT,
  formatQuestionWithContext,
  buildProviderRequest,
  getAiProxyConfig,
} from '../services/ai-proxy/ai-proxy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const chatAreaPath = path.join(rootDir, 'components/chat-area.tsx');
const aiProxyEnvPath = path.join(rootDir, 'services/ai-proxy/.env');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const mistralConfig = getAiProxyConfig({
  AI_PROVIDER: 'mistral',
  MISTRAL_API_KEY: 'test-key',
  MISTRAL_MODEL: 'mistral-small-latest',
});

const defaultPrompt = NEXIFY_OPERATOR_PROMPT;
const sampleContext = {
  workspaceRoot: '/Users/erikbabcan',
  viewMode: 'chat',
  lastCommand: 'pnpm test',
  stack: 'Nexify :3322 · hack-api :3021 · ai-proxy :8788',
  access: 'Tailscale → domáci uzol (Mac)',
};

test('01 — default prompt identifies Nexify (nie chatbot)', () => {
  assert(defaultPrompt.includes('Si Nexify — nie chatbot'), 'missing Nexify identity');
  assert(mistralConfig.systemPrompt === defaultPrompt, 'config must use operator prompt');
});

test('02 — prompt references Erikov Mac', () => {
  assert(defaultPrompt.includes('Erikovmu Macu'), 'missing Erik Mac reference');
});

test('03 — prompt references live_stack v SESSION', () => {
  assert(defaultPrompt.includes('live_stack'), 'missing live_stack');
});

test('04 — prompt references last_command v SESSION', () => {
  assert(defaultPrompt.includes('last_command'), 'missing last_command');
});

test('05 — prompt defines INTENT / ACTION / RESULT format', () => {
  assert(defaultPrompt.includes('INTENT:'), 'missing INTENT');
  assert(defaultPrompt.includes('ACTION:'), 'missing ACTION');
  assert(defaultPrompt.includes('RESULT:'), 'missing RESULT');
});

test('06 — prompt requires $ command prefix', () => {
  assert(defaultPrompt.includes('prefixom $') || defaultPrompt.includes('prefix $'), 'missing $ prefix rule');
});

test('07 — prompt bans generic corporate opener', () => {
  assert(defaultPrompt.includes('Ako vám môžem pomôcť'), 'missing ban on corporate opener');
  assert(!defaultPrompt.includes('NEXIFY TECH CENTER'), 'old TECH CENTER persona still present');
});

test('08 — formatQuestionWithContext builds SESSION block', () => {
  const out = formatQuestionWithContext('ako je stack?', sampleContext);
  assert(out.startsWith('[SESSION]'), 'missing [SESSION]');
  assert(out.includes('[USER]'), 'missing [USER]');
  assert(out.includes('ako je stack?'), 'missing user question');
});

test('09 — SESSION includes workspace and view', () => {
  const out = formatQuestionWithContext('status', sampleContext);
  assert(out.includes('workspace: /Users/erikbabcan'), 'missing workspace');
  assert(out.includes('view: chat'), 'missing view');
});

test('10 — SESSION includes last_command and live_stack', () => {
  const out = formatQuestionWithContext('status', sampleContext);
  assert(out.includes('last_command: pnpm test'), 'missing last_command');
  assert(out.includes('live_stack: Nexify :3322'), 'missing live_stack');
});

test('11 — SESSION includes Tailscale access line', () => {
  const out = formatQuestionWithContext('ping', sampleContext);
  assert(out.includes('access: Tailscale'), 'missing access');
  assert(out.includes('domáci uzol'), 'missing domáci uzol in access');
});

test('12 — empty optional context omits absent fields', () => {
  const out = formatQuestionWithContext('hello', { workspaceRoot: '/tmp' });
  assert(!out.includes('last_command:'), 'should omit last_command when absent');
  assert(out.includes('workspace: /tmp'), 'should keep workspace');
});

test('13 — buildProviderRequest (mistral) embeds Operator system prompt', () => {
  const req = buildProviderRequest('test', mistralConfig, 'test-key', sampleContext);
  const body = JSON.parse(req.options.body);
  assert(body.messages[0].role === 'system', 'missing system message');
  assert(body.messages[0].content.includes('Si Nexify — nie chatbot'), 'system prompt not Nexify persona');
});

test('14 — buildProviderRequest (mistral) injects SESSION into user message', () => {
  const req = buildProviderRequest('čo beží?', mistralConfig, 'test-key', sampleContext);
  const body = JSON.parse(req.options.body);
  const user = body.messages[1].content;
  assert(user.includes('[SESSION]'), 'user message missing SESSION');
  assert(user.includes('last_command: pnpm test'), 'user message missing last_command');
  assert(user.includes('čo beží?'), 'user message missing question');
});

test('15 — buildProviderRequest without context keeps raw question', () => {
  const req = buildProviderRequest('raw only', mistralConfig, 'test-key');
  const body = JSON.parse(req.options.body);
  assert(body.messages[1].content === 'raw only', 'question should not be wrapped');
});

test('16 — buildProviderRequest (gamma) carries SESSION in messages', () => {
  const gammaConfig = getAiProxyConfig({
    AI_PROVIDER: 'gamma',
    GAMMA_API_KEY: 'gamma-test',
    GAMMA_MODEL: 'gamma-4b4',
  });
  const req = buildProviderRequest('gamma?', gammaConfig, null, sampleContext);
  const body = JSON.parse(req.options.body);
  assert(body.messages[1].content.includes('[SESSION]'), 'gamma user message missing SESSION');
});

test('17 — buildProviderRequest (gemini) uses contextual user content', () => {
  const geminiConfig = getAiProxyConfig({
    AI_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'gemini-test',
  });
  const req = buildProviderRequest('gemini?', geminiConfig, null, sampleContext);
  const body = JSON.parse(req.options.body);
  const userText = body.contents[0].parts[0].text;
  assert(userText.includes('[SESSION]'), 'gemini missing SESSION in user content');
  assert(body.systemInstruction.parts[0].text.includes('Si Nexify — nie chatbot'), 'gemini missing Nexify persona');
});

test('18 — chat-area defines buildOperatorContext', () => {
  const src = fs.readFileSync(chatAreaPath, 'utf8');
  assert(src.includes('buildOperatorContext'), 'missing buildOperatorContext');
  assert(src.includes("workspaceRoot: '/Users/erikbabcan'"), 'missing workspaceRoot');
  assert(src.includes('lastCommand'), 'missing lastCommand extraction');
});

test('19 — chat-area sends context in /api/ai POST body', () => {
  const src = fs.readFileSync(chatAreaPath, 'utf8');
  assert(src.includes('context: buildOperatorContext()'), 'missing context in fetch body');
  assert(src.includes("stack: 'Nexify :3322"), 'missing stack in context');
});

test('20 — live AI proxy rejects empty question (integration)', async () => {
  const port = process.env.AI_PROXY_PORT || '8788';
  const res = await fetch(`http://127.0.0.1:${port}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: '   ', context: sampleContext }),
    signal: AbortSignal.timeout(5000),
  });
  assert(res.status === 400, `expected 400, got ${res.status}`);
  const data = await res.json();
  assert(data.error?.includes('Question is required'), 'unexpected error body');
});

console.log('🧪 Nexify Operator — 20 tests\n');

for (const { name, fn } of tests) {
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

console.log('\n==================================================');
console.log(`Nexify Operator: ${passed}/20 passed`);
console.log('==================================================');

if (failed > 0) {
  process.exit(1);
}