import { patternTests, mockTest, readSource } from './framework.mjs';

const chat = 'components/chat-area.tsx';
const layout = 'app/layout.tsx';
const globals = 'app/globals.css';

const tests = [
  ...patternTests(241, layout, 'UI/UX layout', [
    { name: 'viewportFit cover', pattern: /viewportFit:\s*"cover"/ },
    { name: 'dark-friendly antialiased body', pattern: /antialiased/ },
    { name: 'Nexify Terminal title', pattern: /title:\s*"Nexify Terminal"/ },
  ]),
  ...patternTests(244, globals, 'UI/UX tokens', [
    { name: 'background token', pattern: /--background:/ },
    { name: 'accent token', pattern: /--accent:/ },
    { name: 'safe-area-inset-top', pattern: /--safe-area-inset-top/ },
    { name: 'scrollable-container', pattern: /\.scrollable-container/ },
    { name: 'sidebar token', pattern: /--sidebar:/ },
  ]),
  ...patternTests(249, chat, 'UI/UX chat hierarchy', [
    { name: 'operator-status strip', pattern: /operator-status/ },
    { name: 'font-heading usage', pattern: /font-heading|font-\[var\(--font-heading\)\]/ },
    { name: 'active scale press', pattern: /active:scale-\[0\.98\]/ },
    { name: 'bg-sidebar status grouping', pattern: /bg-sidebar/ },
    { name: 'accent or primary interactive', pattern: /text-accent|border-accent|bg-accent/ },
    { name: 'DualChatArea', pattern: /DualChatArea/ },
    { name: 'paste fallback dialog', pattern: /Vložiť text \(PWA Fallback\)/ },
    { name: 'executePasteText', pattern: /executePasteText/ },
  ]),
  ...patternTests(257, 'components/nexify-header.tsx', 'UI/UX header tabs', [
    { name: 'tab height 44px HIG', pattern: /min-h-\[44px\]|minHeight:\s*"44px"/ },
    { name: 'view-tab test ids', pattern: /view-tab-\$\{view\.id\}/ },
  ]),
  mockTest(259, 'UI/UX: chat-area has no btn-3d leftover', () => {
    const src = readSource(chat);
    return !/\bbtn-3d\b/.test(src) && !/\bbtn-glow\b/.test(src);
  }),
  mockTest(260, 'UI/UX: globals has no btn-3d block', () => {
    const src = readSource(globals);
    return !/\.btn-3d\s*\{/.test(src);
  }),
];
export default { name: '09 UI/UX Hierarchy', tests };
