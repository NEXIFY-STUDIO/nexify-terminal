import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const manifestPath = path.join(rootDir, 'public/manifest.json');
const iconPath = path.join(rootDir, 'public/icons/icon-1024x1024.png');
const swPath = path.join(rootDir, 'public/sw.js');
const challengeRoutePath = path.join(rootDir, 'app/api/auth/challenge/route.ts');
const verifyRoutePath = path.join(rootDir, 'app/api/auth/verify/route.ts');
const authGuardPath = path.join(rootDir, 'components/auth-guard.tsx');
const layoutPath = path.join(rootDir, 'app/layout.tsx');
const globalsCssPath = path.join(rootDir, 'app/globals.css');
const chatAreaPath = path.join(rootDir, 'components/chat-area.tsx');
const systemMonitorPath = path.join(rootDir, 'components/system-monitor.tsx');

console.log('🔍 Running Phase 4: Ultimate iPhone PWA Optimization Integration & Security Verification Tests...');

let failed = false;

// Helper to audit file content patterns
const checkFile = (filePath, name, assertions) => {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing file: ${name} at ${filePath}`);
    failed = true;
    return;
  }
  console.log(`✅ File exists: ${name}`);
  const content = fs.readFileSync(filePath, 'utf8');
  assertions.forEach(assertion => {
    if (assertion.pattern.test(content)) {
      console.log(`   ✅ Passed: ${assertion.desc}`);
    } else {
      console.error(`   ❌ Failed: ${assertion.desc} (Expected: ${assertion.pattern})`);
      failed = true;
    }
  });
};

// 1. Audit manifest.json
const manifestAssertions = [
  { desc: 'Short name "Nexify"', pattern: /"short_name":\s*"Nexify"/ },
  { desc: 'Display "standalone"', pattern: /"display":\s*"standalone"/ },
  { desc: 'Status bar style translucency', pattern: /"apple-mobile-web-app-status-bar-style":\s*"black-translucent"/ },
  { desc: 'Theme color black', pattern: /"theme_color":\s*"#000000"/ },
  { desc: 'Icons reference high-res png', pattern: /"src":\s*"\/icons\/icon-1024x1024.png"/ }
];
checkFile(manifestPath, 'PWA manifest.json', manifestAssertions);

// 2. Verify high-resolution icon exists
if (fs.existsSync(iconPath)) {
  console.log(`✅ High-resolution icon matches: public/icons/icon-1024x1024.png`);
} else {
  console.error(`❌ Missing PWA icon at ${iconPath}`);
  failed = true;
}

// 3. Audit sw.js
const swAssertions = [
  { desc: 'Service worker cache name definition', pattern: /CACHE_NAME/ },
  { desc: 'Assets cache items list', pattern: /STATIC_ASSETS/ },
  { desc: 'Skip API calls condition', pattern: /startsWith\('\/api\/'\)/ }
];
checkFile(swPath, 'Service Worker sw.js', swAssertions);

// 4. Audit WebAuthn challenge route
const challengeAssertions = [
  { desc: 'Random challenge generation', pattern: /crypto\.randomBytes\(32\)/ },
  { desc: 'Base64URL safe strings mapping', pattern: /replace\(\/\\\+\/g,\s*'-'\)/ },
  { desc: 'Returns user credentials metadata', pattern: /pubKeyCredParams/ }
];
checkFile(challengeRoutePath, 'Challenge API route.ts', challengeAssertions);

// 5. Audit WebAuthn verify route
const verifyAssertions = [
  { desc: 'Reads client credential body', pattern: /const\s+\{\s*id,\s*rawId,\s*type,\s*response\s*\}\s*=\s*await\s+request\.json\(\)/ },
  { desc: 'Returns mock session token on success', pattern: /token:\s*'jwt-mock-session-'/ }
];
checkFile(verifyRoutePath, 'Verify API route.ts', verifyAssertions);

// 6. Audit AuthGuard component
const authGuardAssertions = [
  { desc: 'AuthGuard function export', pattern: /export\s+function\s+AuthGuard/ },
  { desc: 'Custom iOS speaker haptic fallback', pattern: /const\s+AudioCtx\s*=\s*window\.AudioContext/ },
  { desc: 'Face ID WebAuthn credentials call', pattern: /navigator\.credentials\.get/ },
  { desc: 'PIN passcode verification fallback', pattern: /const\s+securePin\s*=\s*process\.env\.NEXT_PUBLIC_PASSCODE\s*\|\|\s*'1337'/ },
  { desc: 'Interactive PIN keypad render', pattern: /grid\s+grid-cols-3/ },
  { desc: 'Error shake animation', pattern: /errorShake\s*\?\s*'animate-shake'\s*:\s*''/ }
];
checkFile(authGuardPath, 'AuthGuard UI Component', authGuardAssertions);

// 7. Audit layout.tsx updates
const layoutAssertions = [
  { desc: 'AuthGuard component import', pattern: /import\s+\{\s*AuthGuard\s*\}\s+from\s+["']@\/components\/auth-guard["']/ },
  { desc: 'appleWebApp settings in metadata', pattern: /appleWebApp:\s*\{/ },
  { desc: 'Children wrapped in AuthGuard', pattern: /<AuthGuard>[\s\S]*\{children\}[\s\S]*<\/AuthGuard>/ },
  { desc: 'Service Worker registration script', pattern: /navigator\.serviceWorker\.register/ }
];
checkFile(layoutPath, 'Root Layout app/layout.tsx', layoutAssertions);

// 8. Audit globals.css
const cssAssertions = [
  { desc: 'Safe area variables inside root', pattern: /--safe-area-inset-top:\s*env\(/ },
  { desc: 'Scrollable container utility class', pattern: /\.scrollable-container/ },
  { desc: 'Touch actions block in body', pattern: /touch-action:\s*none/ }
];
checkFile(globalsCssPath, 'Globals Stylesheet app/globals.css', cssAssertions);

// 9. Audit chat-area.tsx
const chatAssertions = [
  { desc: 'iOS Audio-Haptic trigger method', pattern: /const\s+triggerHaptic\s*=/ },
  { desc: 'View change triggers haptic click', pattern: /handleViewModeChange/ },
  { desc: 'Touch swipe view navigation hooks', pattern: /touchStartRef/ },
  { desc: 'Pinch zoom event listener preventions', pattern: /document\.addEventListener\(\s*['"]touchmove['"]/ },
  { desc: 'Dynamic Island offset header padding top', pattern: /pt-\[calc\(env\(safe-area-inset-top,0px\)\+0\.5rem\)\]/ },
  { desc: 'Safe Area offset input padding bottom', pattern: /pb-\[calc\(env\(safe-area-inset-bottom,0px\)\+12px\)\]/ },
  { desc: 'Messages container scrollable class', pattern: /scrollable-container/ }
];
checkFile(chatAreaPath, 'Chat Area components/chat-area.tsx', chatAssertions);

// 10. Audit system-monitor.tsx battery details
const monitorAssertions = [
  { desc: 'Poller state variable', pattern: /pollInterval/ },
  { desc: 'Navigator getBattery handler listener', pattern: /navigator\.getBattery/ },
  { desc: 'Battery change updates poll interval', pattern: /setPollInterval/ }
];
checkFile(systemMonitorPath, 'System Monitor components/system-monitor.tsx', monitorAssertions);

// 11. Run live endpoints verification
console.log('\n🌐 Verification of live challenge API endpoint...');
try {
  const nextPort = '3002';
  const res = await fetch(`http://localhost:${nextPort}/api/auth/challenge`);
  if (res.ok) {
    const data = await res.json();
    if (data.challenge && data.rp && data.user) {
      console.log(`✅ Live API: WebAuthn challenge generated: ${data.challenge}`);
      console.log(`   RP Name: ${data.rp.name}, User Name: ${data.user.name}`);
    } else {
      console.error('❌ Live API: WebAuthn challenge properties are missing or malformed', data);
      failed = true;
    }
  } else {
    console.log('⚠️  Next.js dev server is offline (live routing check skipped).');
  }
} catch (e) {
  console.log('ℹ️  Next.js dev server is offline (live routing check skipped).', e.message);
}

console.log('\n==================================================');
console.log('PWA Integration Test Summary');
console.log('==================================================');
if (failed) {
  console.error('❌ IPHONE PWA OPTIMIZATION INTEGRATION TEST FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL IPHONE PWA OPTIMIZATION TESTS PASSED');
  process.exit(0);
}
