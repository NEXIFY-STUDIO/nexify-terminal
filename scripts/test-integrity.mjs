import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chatAreaPath = path.resolve(__dirname, '../components/chat-area.tsx');

console.log('🔍 Running UI Code Integrity Tests on chat-area.tsx...');

if (!fs.existsSync(chatAreaPath)) {
  console.error(`❌ ChatArea component not found at: ${chatAreaPath}`);
  process.exit(1);
}

const content = fs.readFileSync(chatAreaPath, 'utf8');

const assertions = [
  {
    name: 'ChevronIcon component declaration',
    pattern: /const\s+ChevronIcon\s*=\s*\(\{\s*expanded\s*\}\s*:\s*\{\s*expanded\s*:\s*boolean\s*\}\)\s*=>/
  },
  {
    name: 'expandedItems collapsible React state',
    pattern: /const\s+\[expandedItems,\s*setExpandedItems\]\s*=\s*useState<Record<string,\s*boolean>>\(\{\}\)/
  },
  {
    name: 'toggleItem collapsible toggle handler',
    pattern: /const\s+toggleItem\s*=\s*\(id:\s*string\)\s*=>/
  },
  {
    name: 'renderGroups loop structure mapping',
    pattern: /for\s*\(\s*let\s+i\s*=\s*0;\s*i\s*<\s*messages\.length;\s*i\+\+\s*\)\s*\{\s*const\s+msg\s*=\s*messages\[i\];/
  },
  {
    name: 'renderGroups.map rendering output block',
    pattern: /\{renderGroups\.map\(\(group\)\s*=>/
  },
  {
    name: 'pipeline-item class layout markup',
    pattern: /className="pipeline-item"/
  },
  {
    name: 'icon-container class layout markup',
    pattern: /className="icon-container"/
  },
  {
    name: 'terminal-box layout markup',
    pattern: /className="terminal-box"/
  },
  {
    name: 'terminal-content layout markup',
    pattern: /className="terminal-content"/
  },
  {
    name: 'embedded CSS stylesheet style tag',
    pattern: /<style\s+dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:\s*`/
  },
  {
    name: 'CSS blink animation keyframes',
    pattern: /@keyframes\s+blink/
  },
  {
    name: 'CSS spin animation keyframes',
    pattern: /@keyframes\s+spin/
  }
];

let failed = 0;
for (const assertion of assertions) {
  if (assertion.pattern.test(content)) {
    console.log(`✅ Passed: ${assertion.name}`);
  } else {
    console.error(`❌ Failed: ${assertion.name} (Pattern: ${assertion.pattern})`);
    failed++;
  }
}

console.log('\n==================================================');
console.log('UI Integrity Test Summary');
console.log('==================================================');
if (failed === 0) {
  console.log('✅ ALL UI INTEGRITY CHECKS PASSED');
  process.exit(0);
} else {
  console.error(`❌ ${failed} UI INTEGRITY CHECKS FAILED`);
  process.exit(1);
}
