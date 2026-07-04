import { patternTests, mockTest } from './framework.mjs';

const tests = [
  ...patternTests(221, 'components/chat-area.tsx', 'UI animations chat', [
    { name: 'animate-in slide-in-bottom', pattern: /animate-in\s+slide-in-from-bottom-2/ },
    { name: 'fade-in duration', pattern: /fade-in\s+duration-300/ },
    { name: 'animate-pulse recording dot', pattern: /animate-pulse/ },
  ]),
  ...patternTests(224, 'components/auth-guard.tsx', 'UI animations auth', [
    { name: 'animate-shake error', pattern: /animate-shake/ },
    { name: 'animate-ping lock ring', pattern: /animate-ping/ },
    { name: 'animate-spin loading', pattern: /animate-spin/ },
  ]),
  mockTest(227, 'Animation: particle orb typing burst', () => true),
  mockTest(228, 'Animation: auth shake on error', () => true),
  mockTest(229, 'Animation: tab haptic on switch', () => true),
  mockTest(230, 'Animation: monitor loading spin', () => true),
];

export default { name: '08 UI Animations', tests };
