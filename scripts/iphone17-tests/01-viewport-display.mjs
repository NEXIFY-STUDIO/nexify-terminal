import { patternTests, existsTests, mockTest } from './framework.mjs';

const layout = 'app/layout.tsx';
const globals = 'app/globals.css';

const tests = [
  ...patternTests(1, layout, 'Viewport', [
    { name: 'device-width', pattern: /width:\s*"device-width"/ },
    { name: 'initialScale 1', pattern: /initialScale:\s*1/ },
    { name: 'maximumScale 1', pattern: /maximumScale:\s*1/ },
    { name: 'minimumScale 1', pattern: /minimumScale:\s*1/ },
    { name: 'userScalable false', pattern: /userScalable:\s*false/ },
    { name: 'viewportFit cover', pattern: /viewportFit:\s*"cover"/ },
    { name: 'Viewport export', pattern: /export\s+const\s+viewport:\s*Viewport/ },
    { name: 'Metadata title Nexify', pattern: /title:\s*"Nexify Terminal"/ },
    { name: 'manifest link', pattern: /manifest:\s*"\/manifest\.json"/ },
    { name: 'appleWebApp capable', pattern: /appleWebApp:\s*\{/ },
    { name: 'statusBarStyle black-translucent', pattern: /statusBarStyle:\s*"black-translucent"/ },
    { name: 'apple touch icon', pattern: /apple:\s*"\/icons\/icon-1024x1024\.png"/ },
    { name: 'formatDetection email off', pattern: /email:\s*false/ },
    { name: 'formatDetection telephone off', pattern: /telephone:\s*false/ },
    { name: 'AuthGuard wrapper', pattern: /<AuthGuard>/ },
    { name: 'Service worker registration', pattern: /serviceWorker\.register/ },
    { name: 'lang en on html', pattern: /<html\s+lang="en">/ },
    { name: 'antialiased body', pattern: /className="font-sans antialiased"/ },
    { name: 'referrer strict-origin', pattern: /referrer:\s*"strict-origin-when-cross-origin"/ },
    { name: 'Toaster component', pattern: /<Toaster\s*\/>/ },
  ]),
  ...patternTests(21, globals, 'Display CSS', [
    { name: 'safe-area-inset-top var', pattern: /--safe-area-inset-top:\s*env\(safe-area-inset-top/ },
    { name: 'safe-area-inset-bottom var', pattern: /--safe-area-inset-bottom:\s*env\(safe-area-inset-bottom/ },
    { name: 'safe-area-inset-left var', pattern: /--safe-area-inset-left:\s*env\(safe-area-inset-left/ },
    { name: 'safe-area-inset-right var', pattern: /--safe-area-inset-right:\s*env\(safe-area-inset-right/ },
    { name: 'body overflow-hidden', pattern: /@apply\s+overflow-hidden\s+h-dvh\s+w-screen\s+touch-none/ },
    { name: 'overscroll-behavior none on html', pattern: /overscroll-behavior:\s*none/ },
    { name: 'touch-action none on html', pattern: /touch-action:\s*none/ },
    { name: 'webkit-touch-callout none', pattern: /-webkit-touch-callout:\s*none/ },
    { name: 'user-select none', pattern: /user-select:\s*none/ },
    { name: 'touch-action manipulation on all', pattern: /touch-action:\s*manipulation/ },
    { name: 'scrollable-container class', pattern: /\.scrollable-container/ },
    { name: 'scrollable pan-y', pattern: /touch-action:\s*pan-y\s*!important/ },
    { name: 'webkit-overflow-scrolling touch', pattern: /-webkit-overflow-scrolling:\s*touch\s*!important/ },
    { name: 'background black', pattern: /--background:\s*oklch\(0\s+0\s+0\)/ },
    { name: 'foreground white', pattern: /--foreground:\s*oklch\(1\s+0\s+0\)/ },
    { name: 'Space Grotesk heading font', pattern: /"Space Grotesk"/ },
    { name: 'Inter body font', pattern: /"Inter"/ },
    { name: 'apple-system fallback', pattern: /-apple-system/ },
    { name: 'zoom-in-95 animation', pattern: /\.zoom-in-95/ },
    { name: 'keyframes zoom-in-95', pattern: /@keyframes\s+zoom-in-95/ },
  ]),
];

export default { name: '01 Viewport & Display', tests };
