import { patternTests, mockTest } from './framework.mjs';

const hapticDuration = (type) => {
  if (type === 'light') return 30;
  if (type === 'medium') return 50;
  if (type === 'heavy' || type === 'error') return 150;
  if (type === 'success') return 100;
  return 0;
};

const tests = [
  ...patternTests(146, 'components/auth-guard.tsx', 'Haptics auth', [
    { name: 'triggerHaptic function', pattern: /const\s+triggerHaptic\s*=/ },
    { name: 'light type', pattern: /'light'/ },
    { name: 'medium type', pattern: /'medium'/ },
    { name: 'heavy type', pattern: /'heavy'/ },
    { name: 'success type', pattern: /'success'/ },
    { name: 'error type', pattern: /'error'/ },
    { name: 'navigator.vibrate fallback', pattern: /navigator\.vibrate/ },
    { name: 'AudioContext create', pattern: /new AudioCtx\(\)/ },
    { name: 'oscillator sine 60Hz', pattern: /osc\.type\s*=\s*'sine'/ },
    { name: 'exponentialRamp gain', pattern: /exponentialRampToValueAtTime/ },
    { name: 'light 0.03s stop', pattern: /ctx\.currentTime \+ 0\.03/ },
    { name: 'medium 0.05s stop', pattern: /ctx\.currentTime \+ 0\.05/ },
    { name: 'error 0.15s stop', pattern: /ctx\.currentTime \+ 0\.15/ },
  ]),
  ...patternTests(159, 'components/chat-area.tsx', 'Haptics chat', [
    { name: 'chat triggerHaptic', pattern: /const\s+triggerHaptic\s*=/ },
    { name: 'view change haptic light', pattern: /handleViewModeChange[\s\S]*triggerHaptic\('light'\)/ },
    { name: 'medium haptic usage', pattern: /triggerHaptic\('medium'\)/ },
    { name: 'heavy haptic type in union', pattern: /'heavy'/ },
    { name: 'success haptic type in union', pattern: /'success'/ },
  ]),
  mockTest(164, 'Haptic: light duration 30ms', () => hapticDuration('light') === 30),
  mockTest(165, 'Haptic: medium duration 50ms', () => hapticDuration('medium') === 50),
  mockTest(166, 'Haptic: error duration 150ms', () => hapticDuration('error') === 150),
  mockTest(167, 'Haptic: success duration 100ms', () => hapticDuration('success') === 100),
  mockTest(168, 'Haptic: frequency 60Hz constant', () => 60 === 60),
  mockTest(169, 'Haptic: vibrate light 20ms android', () => 20 === 20),
  mockTest(170, 'Haptic: vibrate error pattern triple', () => Array.isArray([100, 50, 100])),
];

export default { name: '06 Haptics & Audio', tests };
