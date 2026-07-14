import { patternTests, existsTests } from './framework.mjs';

const tests = [
  ...existsTests(42, [
    'public/manifest.json',
    'public/sw.js',
    'public/icons/icon-1024x1024.png',
    'public/icons/icon-192x192.png',
    'public/icons/icon-512x512.png',
    'public/icons/icon-512x512-maskable.png',
    'public/apple-icon.png',
    'public/favicon.ico',
    'app/api/auth/challenge/route.ts',
    'app/api/auth/verify/route.ts',
  ], 'PWA file'),
  ...patternTests(47, 'public/manifest.json', 'Manifest', [
    { name: 'short_name Nexify', pattern: /"short_name":\s*"Nexify"/ },
    { name: 'display standalone', pattern: /"display":\s*"standalone"/ },
    { name: 'start_url root', pattern: /"start_url":\s*"\/"/ },
    { name: 'theme_color black', pattern: /"theme_color":\s*"#000000"/ },
    { name: 'background_color black', pattern: /"background_color":\s*"#000000"/ },
    { name: 'apple-mobile-web-app-capable', pattern: /"apple-mobile-web-app-capable":\s*true/ },
    { name: 'status-bar black-translucent', pattern: /"apple-mobile-web-app-status-bar-style":\s*"black-translucent"/ },
    { name: 'icon 1024 maskable', pattern: /"purpose":\s*"any maskable"/ },
    { name: 'icon png type', pattern: /"type":\s*"image\/png"/ },
    { name: 'icon 192 size', pattern: /"src":\s*"\/icons\/icon-192x192.png"/ },
    { name: 'icon 512 size', pattern: /"src":\s*"\/icons\/icon-512x512.png"/ },
    { name: 'icon 512 maskable size', pattern: /"src":\s*"\/icons\/icon-512x512-maskable.png"/ },
    { name: 'name Nexify Terminal', pattern: /"name":\s*"Nexify Terminal"/ },
  ]),
  ...patternTests(57, 'public/sw.js', 'ServiceWorker', [
    { name: 'CACHE_NAME defined', pattern: /CACHE_NAME/ },
    { name: 'STATIC_ASSETS list', pattern: /STATIC_ASSETS/ },
    { name: 'skip API routes', pattern: /startsWith\('\/api\/'\)/ },
    { name: 'install event listener', pattern: /addEventListener\(\s*['"]install['"]/ },
    { name: 'fetch event listener', pattern: /addEventListener\(\s*['"]fetch['"]/ },
    { name: 'caches.open', pattern: /caches\.open/ },
    { name: 'cache.add per asset', pattern: /cache\.add\(asset\)/ },
  ]),
  ...patternTests(64, 'app/api/auth/challenge/route.ts', 'WebAuthn challenge', [
    { name: 'randomBytes 32', pattern: /randomBytes\(32\)/ },
    { name: 'pubKeyCredParams', pattern: /pubKeyCredParams/ },
    { name: 'base64url replace', pattern: /replace\(\/\\\+\/g,\s*'-'\)/ },
  ]),
  ...patternTests(67, 'app/api/auth/verify/route.ts', 'WebAuthn verify', [
    { name: 'reads credential body', pattern: /await\s+request\.json\(\)/ },
    { name: 'returns session token', pattern: /token:/ },
  ]),
  ...patternTests(69, 'app/layout.tsx', 'Layout PWA', [
    { name: 'AuthGuard import', pattern: /import\s+\{\s*AuthGuard\s*\}/ },
    { name: 'manifest in metadata', pattern: /manifest:\s*"\/manifest\.json"/ },
    { name: 'appleWebApp title', pattern: /title:\s*"Nexify"/ },
    { name: 'favicon ico', pattern: /favicon\.ico/ },
    { name: 'icon-light 32', pattern: /icon-light-32x32\.png/ },
    { name: 'icon-dark 32', pattern: /icon-dark-32x32\.png/ },
    { name: 'icon svg', pattern: /icon\.svg/ },
    { name: 'apple icon png', pattern: /apple-icon\.png/ },
    { name: 'globals.css import', pattern: /import\s+"\.\/globals\.css"/ },
  ]),
  ...patternTests(76, 'components/auth-guard.tsx', 'AuthGuard PWA', [
    { name: 'localStorage session', pattern: /localStorage\.getItem\('nexify_authenticated'\)/ },
  ]),
];

export default { name: '02 PWA & Standalone', tests };
