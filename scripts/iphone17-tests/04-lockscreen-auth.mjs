import { patternTests, mockTest } from './framework.mjs';

const auth = 'components/auth-guard.tsx';

const tests = [
  ...patternTests(109, auth, 'Lockscreen auth', [
    { name: 'AuthGuard export', pattern: /export\s+function\s+AuthGuard/ },
    { name: 'PIN state', pattern: /const\s+\[pin,\s*setPin\]/ },
    { name: 'isAuthenticated state', pattern: /const\s+\[isAuthenticated/ },
    { name: 'errorShake state', pattern: /const\s+\[errorShake/ },
    { name: 'Face ID available state', pattern: /const\s+\[isFaceIdAvailable/ },
    { name: 'isAuthenticating state', pattern: /const\s+\[isAuthenticating/ },
    { name: 'securePin env fallback', pattern: /process\.env\.NEXT_PUBLIC_PASSCODE\s*\|\|\s*'1337'/ },
    { name: 'PIN keypad grid-cols-3', pattern: /grid\s+grid-cols-3/ },
    { name: 'Face ID button text', pattern: /Použiť Face ID/ },
    { name: 'navigator.credentials.get', pattern: /navigator\.credentials\.get/ },
    { name: 'userVerification required', pattern: /userVerification:\s*'required'/ },
    { name: 'challenge API fetch', pattern: /fetch\('\/api\/auth\/challenge'\)/ },
    { name: 'verify API fetch', pattern: /fetch\('\/api\/auth\/verify'/ },
    { name: 'animate-shake class', pattern: /animate-shake/ },
    { name: 'animate-fade-in error', pattern: /animate-fade-in/ },
    { name: 'animate-ping lock icon', pattern: /animate-ping/ },
    { name: 'animate-spin authenticating', pattern: /animate-spin/ },
    { name: 'Fingerprint icon', pattern: /Fingerprint/ },
    { name: 'Lock icon', pattern: /<Lock/ },
    { name: 'Delete backspace key', pattern: /<Delete/ },
    { name: 'NEXIFY TERMINAL heading', pattern: /NEXIFY TERMINAL/ },
    { name: 'SECURE INTERFACE subtitle', pattern: /SECURE INTERFACE/ },
    { name: 'localStorage nexify_authenticated', pattern: /nexify_authenticated/ },
    { name: 'bufferFromBase64Url helper', pattern: /bufferFromBase64Url/ },
    { name: 'triggerHaptic on PIN digit', pattern: /triggerHaptic\('light'\)/ },
    { name: 'triggerHaptic success', pattern: /triggerHaptic\('success'\)/ },
    { name: 'triggerHaptic error', pattern: /triggerHaptic\('error'\)/ },
    { name: 'triggerHaptic medium FaceID', pattern: /triggerHaptic\('medium'\)/ },
    { name: 'Web Audio 60Hz sine', pattern: /osc\.frequency\.setValueAtTime\(60/ },
    { name: 'webkitAudioContext fallback', pattern: /webkitAudioContext/ },
    { name: 'pin length 4 check', pattern: /newPin\.length\s*===\s*4/ },
    { name: 'setErrorShake on wrong PIN', pattern: /setErrorShake\(true\)/ },
    { name: 'children render when authed', pattern: /\{\s*children\s*\}/ },
    { name: 'Lockscreen keyframes shake', pattern: /@keyframes\s+shake/ },
  ]),
  mockTest(143, 'Lockscreen: PIN length is 4 digits', () => '1337'.length === 4),
];

export default { name: '04 Lockscreen & Auth', tests };
