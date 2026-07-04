import { patternTests } from './framework.mjs';

const tests = [
  ...patternTests(78, 'app/globals.css', 'SafeArea CSS', [
    { name: 'inset-top env fallback', pattern: /--safe-area-inset-top:\s*env\(safe-area-inset-top,\s*0px\)/ },
    { name: 'inset-bottom env fallback', pattern: /--safe-area-inset-bottom:\s*env\(safe-area-inset-bottom,\s*0px\)/ },
    { name: 'inset-left env fallback', pattern: /--safe-area-inset-left:\s*env\(safe-area-inset-left,\s*0px\)/ },
    { name: 'inset-right env fallback', pattern: /--safe-area-inset-right:\s*env\(safe-area-inset-right,\s*0px\)/ },
    { name: 'h-dvh full height', pattern: /h-dvh/ },
    { name: 'w-screen full width', pattern: /w-screen/ },
  ]),
  ...patternTests(84, 'components/chat-area.tsx', 'Dynamic Island layout', [
    { name: 'header safe-area top padding', pattern: /pt-\[calc\(env\(safe-area-inset-top,0px\)\+0\.5rem\)\]/ },
    { name: 'input safe-area bottom padding', pattern: /pb-\[calc\(env\(safe-area-inset-bottom,0px\)\+12px\)\]/ },
    { name: 'header backdrop blur', pattern: /backdrop-blur-sm/ },
    { name: 'header border bottom', pattern: /border-b\s+border-border/ },
    { name: 'header z-10', pattern: /relative\s+z-10/ },
    { name: 'scrollable-container on messages', pattern: /scrollable-container/ },
    { name: 'fixed inset lock overlay z-10000', pattern: /z-\[10000\]/ },
    { name: 'input area mt-auto', pattern: /mt-auto/ },
    { name: 'max-w-4xl input container', pattern: /max-w-4xl/ },
    { name: 'rounded-full input bar', pattern: /rounded-full/ },
  ]),
  ...patternTests(94, 'components/auth-guard.tsx', 'Lockscreen safe area', [
    { name: 'fixed inset-0 lockscreen', pattern: /fixed\s+inset-0/ },
    { name: 'z-9999 auth overlay', pattern: /z-\[9999\]/ },
    { name: 'flex center lockscreen', pattern: /flex\s+items-center\s+justify-center/ },
    { name: 'max-w-440 lock card', pattern: /max-w-\[440px\]/ },
    { name: 'gap-36 lock spacing', pattern: /gap-\[36px\]/ },
    { name: 'px-8 horizontal padding', pattern: /px-8/ },
  ]),
  ...patternTests(100, 'app/layout.tsx', 'Viewport cover', [
    { name: 'viewportFit cover export', pattern: /viewportFit:\s*"cover"/ },
    { name: 'userScalable false', pattern: /userScalable:\s*false/ },
  ]),
  ...patternTests(102, 'components/chat-area.tsx', 'Tab bar layout', [
    { name: 'flex tab navigation', pattern: /handleViewModeChange\('chat'\)/ },
    { name: 'terminal tab button', pattern: /handleViewModeChange\('terminal'\)/ },
    { name: 'files tab button', pattern: /handleViewModeChange\('files'\)/ },
    { name: 'system tab button', pattern: /handleViewModeChange\('system'\)/ },
    { name: 'insolvency tab button', pattern: /handleViewModeChange\('insolvency'\)/ },
    { name: 'chat tab active styling', pattern: /viewMode\s*===\s*'chat'/ },
  ]),
];

export default { name: '03 Safe Area & Dynamic Island', tests };
