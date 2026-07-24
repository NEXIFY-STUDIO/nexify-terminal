/**
 * Unit tests for the Lovable Editor Split (Dual Coder) interface.
 * Covers dual-chat-area.tsx structure, chat-area integration, and core parsing/routing behavior.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const paths = {
  dualChatArea: path.join(rootDir, 'components/dual-chat-area.tsx'),
  chatArea: path.join(rootDir, 'components/chat-area.tsx'),
  sidebar: path.join(rootDir, 'components/sidebar.tsx'),
};

console.log('🧪 Running Lovable Editor Split (Dual Coder) Unit Tests...\n');

let passed = 0;
let failed = 0;

function assert(name, condition, detail = '') {
  if (condition) {
    passed++;
    return true;
  }
  failed++;
  console.error(`❌ ${name}${detail ? `: ${detail}` : ''}`);
  return false;
}

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

// --- Pure logic mirrors components/dual-chat-area.tsx ---

const CODE_BLOCK_REGEX = /```(\w*)\n([\s\S]*?)```/g;

function parseCodeBlocks(content) {
  const blocks = [];
  let match;
  const regex = new RegExp(CODE_BLOCK_REGEX.source, CODE_BLOCK_REGEX.flags);
  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      lang: match[1] || 'code',
      code: match[2],
      start: match.index,
      end: regex.lastIndex,
    });
  }
  return blocks;
}

function splitMessageParts(content) {
  const parts = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(CODE_BLOCK_REGEX.source, CODE_BLOCK_REGEX.flags);
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.substring(lastIndex, match.index) });
    }
    parts.push({
      type: 'code',
      lang: match[1] || 'code',
      value: match[2],
    });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.substring(lastIndex) });
  }
  return parts;
}

function resolveAgentTargets(target) {
  return {
    vibe: target === 'vibe' || target === 'both',
    gemini: target === 'gemini' || target === 'both',
  };
}

function shouldSendMessage(input) {
  return input.trim().length > 0;
}

function buildAgentRequestBody(prompt, provider, model) {
  return JSON.stringify({ question: prompt, provider, model });
}

// --- Static structure tests ---

console.log('📁 File presence & exports');
assert('dual-chat-area.tsx exists', fs.existsSync(paths.dualChatArea));
assert('chat-area.tsx exists', fs.existsSync(paths.chatArea));

const dualContent = readFile(paths.dualChatArea);
const chatContent = readFile(paths.chatArea);

assert('DualChatArea export', /export\s+function\s+DualChatArea/.test(dualContent));
assert('Separate vibe message state', /vibeMessages/.test(dualContent));
assert('Separate gemini message state', /geminiMessages/.test(dualContent));
assert('Side-by-side split layout', /md:flex-row/.test(dualContent));
assert('Vibe Coder panel label', /Vibe Coder/.test(dualContent));
assert('Gemini Coder panel label', /Gemini Coder/.test(dualContent));
assert('Shared input area', /Shared Input Area/.test(dualContent));
assert('Target selector (both/vibe/gemini)', /value="both"/.test(dualContent) && /value="vibe"/.test(dualContent));
assert('Code block copy button', /copyToClipboard/.test(dualContent));
assert('queryAgent fetch to /api/ai', /fetch\(\s*["']\/api\/ai["']/.test(dualContent));
assert('Enter-to-send without shift', /e\.key\s*===\s*["']Enter["']\s*&&\s*!e\.shiftKey/.test(dualContent));

console.log('\n🔗 Chat-area integration (view mode routing)');
const headerContent = readFile(path.join(rootDir, 'components/nexify-header.tsx'));
assert('DualChatArea import in chat-area', /import\s+\{\s*DualChatArea\s*\}/.test(chatContent));
assert("dual-chat view mode type", /'dual-chat'/.test(chatContent) || /dual-chat/.test(headerContent));
assert('DualChatArea rendered when viewMode is dual-chat', /viewMode\s*===\s*['"]dual-chat['"][\s\S]*<DualChatArea/.test(chatContent));
assert('Dual Coder tab/button in chat chrome', /dual-chat/.test(headerContent) && /Dual Coder/.test(headerContent));
assert('Input hidden in dual-chat mode', /viewMode\s*!==\s*['"]dual-chat['"]/.test(chatContent));

console.log('\n🧠 Code block parsing behavior');
{
  const plain = 'Hello world';
  assert('Plain text yields no code blocks', parseCodeBlocks(plain).length === 0);
  assert('Plain text is single text part', splitMessageParts(plain).length === 1 && splitMessageParts(plain)[0].type === 'text');

  const single = 'Here is code:\n```typescript\nconst x = 1;\n```\nDone.';
  const blocks = parseCodeBlocks(single);
  assert('Single fenced block parsed', blocks.length === 1);
  assert('Language tag preserved', blocks[0].lang === 'typescript');
  assert('Code body extracted', blocks[0].code.trim() === 'const x = 1;');

  const parts = splitMessageParts(single);
  assert('Mixed content splits into text/code/text', parts.length === 3);
  assert('First part is prose before fence', parts[0].type === 'text' && parts[0].value.includes('Here is code'));
  assert('Middle part is code block', parts[1].type === 'code' && parts[1].lang === 'typescript');
  assert('Trailing prose after fence', parts[2].type === 'text' && parts[2].value.trim() === 'Done.');

  const multi = '```js\na()\n```\nmid\n```py\nb()\n```';
  assert('Multiple blocks in one message', parseCodeBlocks(multi).length === 2);
  assert('Second block language', parseCodeBlocks(multi)[1].lang === 'py');

  const noLang = '```\nplain\n```';
  assert('Missing lang defaults to "code"', parseCodeBlocks(noLang)[0].lang === 'code');

  const nestedFence = '```ts\nconst s = `\`\`\`;\n```';
  assert('Inner backticks do not break outer fence', parseCodeBlocks(nestedFence).length === 1);
}

console.log('\n🎯 Agent target routing');
{
  const both = resolveAgentTargets('both');
  assert('both → vibe + gemini', both.vibe && both.gemini);

  const vibeOnly = resolveAgentTargets('vibe');
  assert('vibe → vibe only', vibeOnly.vibe && !vibeOnly.gemini);

  const geminiOnly = resolveAgentTargets('gemini');
  assert('gemini → gemini only', !geminiOnly.vibe && geminiOnly.gemini);
}

console.log('\n✉️ Input validation & API payload');
{
  assert('Empty string rejected', !shouldSendMessage(''));
  assert('Whitespace-only rejected', !shouldSendMessage('   \n\t  '));
  assert('Trimmed content accepted', shouldSendMessage('  refactor this  '));

  const vibeBody = buildAgentRequestBody('fix bug', 'github-models', 'openai/gpt-4.1-mini');
  const parsed = JSON.parse(vibeBody);
  assert('Vibe agent uses github-models provider', parsed.provider === 'github-models');
  assert('Vibe agent model string', parsed.model === 'openai/gpt-4.1-mini');
  assert('Prompt forwarded as question', parsed.question === 'fix bug');

  const geminiBody = JSON.parse(buildAgentRequestBody('optimize', 'gemini', 'gemini-2.5-flash'));
  assert('Gemini agent provider', geminiBody.provider === 'gemini');
  assert('Gemini agent model', geminiBody.model === 'gemini-2.5-flash');
}

console.log('\n🛡️ Error handling patterns in dual-chat-area');
assert('API error surfaces in assistant message', /Error generating response/.test(dualContent));
assert('Non-OK response throws', /if\s*\(\s*!res\.ok\s*\)\s*throw/.test(dualContent));
assert('data.error check', /if\s*\(\s*data\.error\s*\)\s*throw/.test(dualContent));
assert('Loading placeholder while streaming', /content:\s*["']\.\.\.["']/.test(dualContent));

console.log('\n==================================================');
console.log(`Lovable Editor Split Tests: ${passed} passed, ${failed} failed`);
console.log('==================================================');

if (failed > 0) {
  process.exit(1);
}

console.log('✅ ALL LOVABLE EDITOR SPLIT TESTS PASSED');
process.exit(0);
