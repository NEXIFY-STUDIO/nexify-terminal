/**
 * Nexify Terminal — test category registry.
 * Used by test-e2e-finalize.mjs and CI reporting.
 */
export const TEST_CATEGORIES = [
  {
    id: 'integrity',
    name: 'Code Integrity',
    script: 'scripts/test-integrity-suite.mjs',
    npm: 'test:integrity-61',
    tests: 75,
    ci: true,
    iphonePull: true,
    description: 'Regex/static assertions on core UI, API, proxy, security modules',
  },
  {
    id: 'security',
    name: 'Security Audit',
    script: 'scripts/test-security.mjs',
    npm: 'test:security',
    tests: null,
    ci: true,
    iphonePull: false,
    description: 'ENV secrets, rate limiting, XSS/SQL patterns',
  },
  {
    id: 'pin',
    name: 'PIN / AuthGuard',
    script: 'scripts/test-pin.mjs',
    npm: 'test:pin',
    tests: 4,
    ci: true,
    iphonePull: false,
    description: 'Passcode 2366 verification flow',
  },
  {
    id: 'operator',
    name: 'Nexify Operator',
    script: 'scripts/test-nexify-operator.mjs',
    npm: 'test:nexify-operator',
    tests: 21,
    ci: true,
    iphonePull: true,
    description: 'AI proxy prompt, SESSION inject, provider requests',
  },
  {
    id: 'persona',
    name: 'Megaprompt Persona',
    script: 'scripts/test-nexify-persona.mjs',
    npm: 'test:nexify-persona',
    tests: 22,
    ci: true,
    iphonePull: true,
    description: 'Unified decision-tree NEXIFY_OPERATOR_PROMPT',
  },
  {
    id: 'operator-ux',
    name: 'Operator UX',
    script: 'scripts/test-operator-ux.mjs',
    npm: 'test:operator-ux',
    tests: 48,
    ci: true,
    iphonePull: true,
    description: 'Shell chips, session commands, voice v9, export v10',
  },
  {
    id: 'github-iphone',
    name: 'GitHub Pull → iPhone Integrity',
    script: 'scripts/test-github-iphone-integrity.mjs',
    npm: 'test:github-iphone',
    tests: 35,
    ci: true,
    iphonePull: true,
    description: 'Post git pull validation for iPhone 17 Air deploy path',
  },
  {
    id: 'iphone17-static',
    name: 'iPhone 17 Air Static',
    script: 'scripts/test-iphone17-air-300.mjs',
    npm: 'test:iphone17-static',
    tests: 250,
    ci: true,
    iphonePull: true,
    description: '250 source-pattern tests across 8 iPhone modules (#001–#250)',
  },
  {
    id: 'iphone17-live',
    name: 'iPhone 17 Air Live (Playwright)',
    script: 'scripts/iphone17-playwright/playwright.config.ts',
    npm: 'test:iphone17-live',
    tests: 50,
    ci: false,
    iphonePull: false,
    description: 'Playwright device profile tests #251–#300 (needs running :3322)',
  },
  {
    id: 'pwa',
    name: 'PWA Integration',
    script: 'scripts/test-pwa.mjs',
    npm: 'test:pwa',
    tests: null,
    ci: false,
    iphonePull: true,
    description: 'manifest, SW, icons, WebAuthn routes',
  },
  {
    id: 'tailscale',
    name: 'Tailscale Lockdown',
    script: 'scripts/test-tailscale-restriction.mjs',
    npm: 'test:tailscale',
    tests: null,
    ci: false,
    iphonePull: false,
    description: '403 for non-Tailscale IPs (needs live stack)',
  },
  {
    id: 'stability',
    name: 'Stability & Network Soak',
    script: 'scripts/test-stability-network.mjs',
    npm: 'test:stability',
    tests: null,
    ci: false,
    iphonePull: false,
    description: 'Burst requests, health matrix, launchd recovery',
  },
  {
    id: 'button-hit-targets',
    name: 'Button Hit Targets',
    script: 'scripts/iphone17-playwright/button-hit-targets.config.ts',
    npm: 'test:button-hit-targets',
    tests: null,
    ci: false,
    iphonePull: false,
    description: '44px min touch targets (Playwright)',
  },
  {
    id: 'lovable-split',
    name: 'Lovable Editor Split',
    script: 'scripts/test-lovable-editor-split.mjs',
    npm: 'test:lovable-editor-split',
    tests: null,
    ci: false,
    iphonePull: false,
    description: 'Legacy editor split regression',
  },
];

export const IPHONE17_STATIC_MODULES = [
  '01-viewport-display',
  '02-pwa-standalone',
  '03-safe-area-dynamic-island',
  '04-lockscreen-auth',
  '05-gestures-navigation',
  '06-haptics-audio',
  '07-webgl-particles',
  '08-ui-animations',
];

export function countNumberedTests() {
  return TEST_CATEGORIES.reduce((sum, c) => sum + (c.tests ?? 0), 0);
}

export function categoriesForIphonePull() {
  return TEST_CATEGORIES.filter((c) => c.iphonePull);
}

export function printCatalogSummary() {
  const numbered = countNumberedTests();
  const categories = TEST_CATEGORIES.length;
  const iphone = categoriesForIphonePull().length;
  console.log(`Test categories: ${categories}`);
  console.log(`Numbered assertions/tests: ${numbered}`);
  console.log(`iPhone pull-safe categories: ${iphone}`);
  return { categories, numbered, iphone };
}