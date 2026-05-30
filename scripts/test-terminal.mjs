import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const chatAreaPath = path.join(rootDir, 'components/chat-area.tsx');
const terminalViewPath = path.join(rootDir, 'components/terminal-view.tsx');
const globalsCssPath = path.join(rootDir, 'app/globals.css');

console.log('🔍 Running xterm.js Terminal Integration Unit and Integrity Tests...');

let failed = false;

// 1. Check files existence
console.log('\n📁 Verifying file paths...');
const filesToCheck = [
  { name: 'TerminalView Component', path: terminalViewPath },
  { name: 'ChatArea Component', path: chatAreaPath },
  { name: 'Globals CSS stylesheet', path: globalsCssPath }
];

filesToCheck.forEach(file => {
  if (fs.existsSync(file.path)) {
    console.log(`✅ File exists: ${file.name}`);
  } else {
    console.error(`❌ Missing file: ${file.name} at ${file.path}`);
    failed = true;
  }
});

if (failed) process.exit(1);

// 2. Audit globals.css for xterm import
console.log('\n🎨 Verifying globals.css contains xterm CSS import...');
const cssContent = fs.readFileSync(globalsCssPath, 'utf8');
if (cssContent.includes('@import "xterm/css/xterm.css";') || cssContent.includes("xterm/css/xterm.css")) {
  console.log('✅ globals.css correctly imports xterm.css styles');
} else {
  console.error('❌ globals.css is missing xterm.css import');
  failed = true;
}

// 3. Audit chat-area.tsx code integrity
console.log('\n💬 Verifying chat-area.tsx terminal toggle state & render integrations...');
const chatContent = fs.readFileSync(chatAreaPath, 'utf8');

const chatAssertions = [
  {
    name: 'Import statement for TerminalView',
    pattern: /import\s*\{\s*TerminalView\s*\}\s*from\s*["']@\/components\/terminal-view["']/
  },
  {
    name: 'viewMode React state declaration',
    pattern: /const\s+\[viewMode,\s*setViewMode\]\s*=\s*useState<\s*['"]chat['"]\s*\|\s*['"]terminal['"]\s*\|\s*['"]files['"](?:\s*\|\s*['"]system['"])?\s*>\(\s*['"]chat['"]\s*\)/
  },
  {
    name: 'View Mode Toggle Button for Chat mode',
    pattern: /onClick=\{\(\)\s*=>\s*(?:setViewMode|handleViewModeChange)\(['"]chat['"]\)\}/
  },
  {
    name: 'View Mode Toggle Button for Terminal mode',
    pattern: /onClick=\{\(\)\s*=>\s*(?:setViewMode|handleViewModeChange)\(['"]terminal['"]\)\}/
  },
  {
    name: 'Conditional check for viewMode === \'terminal\'',
    pattern: /viewMode\s*===\s*['"]terminal['"]/
  },
  {
    name: 'TerminalView tag binding with sessionId',
    pattern: /<TerminalView\s+sessionId=\{shellSessionId\}\s*\/>/
  },
  {
    name: 'Input area conditional wrapper based on viewMode',
    pattern: /viewMode\s*!==\s*['"]terminal['"]\s*&&\s*\(/
  }
];

chatAssertions.forEach(assertion => {
  if (assertion.pattern.test(chatContent)) {
    console.log(`✅ Passed: ${assertion.name}`);
  } else {
    console.error(`❌ Failed: ${assertion.name} (Pattern: ${assertion.pattern})`);
    failed = true;
  }
});

// 4. Audit terminal-view.tsx code integrity
console.log('\n🖥️ Verifying terminal-view.tsx dynamic load, resize & communication bindings...');
const termContent = fs.readFileSync(terminalViewPath, 'utf8');

const termAssertions = [
  {
    name: 'TerminalView component export declaration',
    pattern: /export\s+function\s+TerminalView/
  },
  {
    name: 'Dynamic import of xterm',
    pattern: /await\s+import\(\s*["']xterm["']\s*\)/
  },
  {
    name: 'Dynamic import of xterm-addon-fit',
    pattern: /await\s+import\(\s*["']xterm-addon-fit["']\s*\)/
  },
  {
    name: 'Window resize listener subscription',
    pattern: /window\.addEventListener\(\s*["']resize["']\s*,\s*handleResize\s*\)/
  },
  {
    name: 'POST fetch input transmission',
    pattern: /fetch\(\s*`\/api\/shell\?path=sessions\/\$\{sessionId\}\/input`/
  },
  {
    name: 'EventSource subscription for SSE streaming output',
    pattern: /new\s+EventSource\(\s*`\/api\/shell\?path=sessions\/\$\{sessionId\}\/stream`/
  },
  {
    name: 'Cleanup: EventSource close handler',
    pattern: /eventSource\.close\(\)/
  },
  {
    name: 'Cleanup: Terminal instance dispose handler',
    pattern: /terminalRef\.current\.dispose\(\)/
  }
];

termAssertions.forEach(assertion => {
  if (assertion.pattern.test(termContent)) {
    console.log(`✅ Passed: ${assertion.name}`);
  } else {
    console.error(`❌ Failed: ${assertion.name} (Pattern: ${assertion.pattern})`);
    failed = true;
  }
});

// 5. Query local hacking-api health check (if running)
console.log('\n🌐 Checking if local Hacking-API is alive and configuration fits...');
const ptyPort = process.env.PORT || '3010';
try {
  const res = await fetch(`http://localhost:${ptyPort}/health`);
  if (res.ok) {
    const health = await res.json();
    console.log(`✅ Hacking-API is running locally on port ${ptyPort}!`);
    console.log(`   Status: ${health.status}, version: ${health.version}`);
    console.log(`   Active Sessions: ${health.shell.activeSessions}/${health.shell.maxSessions}`);
  } else {
    console.log(`⚠️  Hacking-API returned non-200 on port ${ptyPort}. It might be running under a different configuration.`);
  }
} catch (e) {
  console.log(`ℹ️  Hacking-API is not running at http://localhost:${ptyPort} (OK if dev server is currently offline).`);
}

console.log('\n==================================================');
console.log('Terminal Integration Test Summary');
console.log('==================================================');
if (failed) {
  console.error('❌ TERMINAL INTEGRATION TEST FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL TERMINAL INTEGRATION TESTS PASSED');
  process.exit(0);
}
