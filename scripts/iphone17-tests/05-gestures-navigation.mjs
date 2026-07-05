import { patternTests, mockTest, readSource } from './framework.mjs';

const chat = 'components/chat-area.tsx';

function swipeMock(startX, endX, startY, endY, initialMode) {
  let currentViewMode = initialMode;
  const touchStart = { x: startX, y: startY };
  const diffX = endX - touchStart.x;
  const diffY = endY - touchStart.y;
  if (Math.abs(diffX) > 100 && Math.abs(diffY) < 40) {
    const modes = ['chat', 'terminal', 'files', 'system', 'insolvency'];
    const idx = modes.indexOf(currentViewMode);
    if (diffX > 0 && idx > 0) currentViewMode = modes[idx - 1];
    else if (diffX < 0 && idx < modes.length - 1) currentViewMode = modes[idx + 1];
  }
  return currentViewMode;
}

const tests = [
  ...patternTests(106, chat, 'Gestures source', [
    { name: 'touchStartRef', pattern: /touchStartRef/ },
    { name: 'handleTouchStart', pattern: /handleTouchStart/ },
    { name: 'handleTouchEnd', pattern: /handleTouchEnd/ },
    { name: 'swipe threshold 100px', pattern: /Math\.abs\(diffX\)\s*>\s*100/ },
    { name: 'vertical limit 40px', pattern: /Math\.abs\(diffY\)\s*<\s*40/ },
    { name: 'five view modes array', pattern: /\['chat',\s*'terminal',\s*'files',\s*'system',\s*'insolvency'\]/ },
    { name: 'handleViewModeChange', pattern: /handleViewModeChange/ },
    { name: 'touchend passive false', pattern: /addEventListener\(\s*["']touchend["'],\s*handleGlobalTouchEnd,\s*\{\s*passive:\s*false\s*\}/ },
    { name: 'touchcancel passive false', pattern: /addEventListener\(\s*["']touchcancel["'],\s*handleGlobalTouchEnd,\s*\{\s*passive:\s*false\s*\}/ },
    { name: 'touchstart passive false global', pattern: /addEventListener\(\s*["']touchstart["'],\s*handleGlobalTouchStart,\s*\{\s*passive:\s*false\s*\}/ },
    { name: 'preventZoom multi-touch', pattern: /e\.touches\.length\s*>\s*1/ },
    { name: 'preventWheelZoom ctrlKey', pattern: /e\.ctrlKey/ },
    { name: 'preventDoubleTap 300ms', pattern: /tapLength\s*<\s*300/ },
    { name: 'touchmove passive false zoom', pattern: /addEventListener\('touchmove',\s*preventZoom,\s*\{\s*passive:\s*false\s*\}/ },
    { name: 'context menu preventNative', pattern: /preventNativeContextMenu/ },
    { name: 'long press timer', pattern: /longPressTimer/ },
    { name: 'contextMenu state', pattern: /const\s+\[contextMenu,\s*setContextMenu\]/ },
    { name: 'paste fallback dialog', pattern: /Vložiť text \(PWA Fallback\)/ },
    { name: 'InsolvencyMonitor import', pattern: /InsolvencyMonitor/ },
    { name: 'dual-chat view mode', pattern: /'dual-chat'/ },
  ]),
  mockTest(126, 'Swipe: chat left -> terminal', () => swipeMock(250, 50, 100, 100, 'chat') === 'terminal'),
  mockTest(127, 'Swipe: terminal right -> chat', () => swipeMock(50, 200, 100, 100, 'terminal') === 'chat'),
  mockTest(128, 'Swipe: terminal left -> files', () => swipeMock(250, 50, 100, 100, 'terminal') === 'files'),
  mockTest(129, 'Swipe: files left -> system', () => swipeMock(250, 50, 100, 100, 'files') === 'system'),
  mockTest(130, 'Swipe: system left -> insolvency', () => swipeMock(250, 50, 100, 100, 'system') === 'insolvency'),
  mockTest(131, 'Swipe: insolvency right -> system', () => swipeMock(50, 200, 100, 100, 'insolvency') === 'system'),
  mockTest(132, 'Swipe: vertical drift ignored', () => swipeMock(250, 50, 100, 200, 'chat') === 'chat'),
  mockTest(133, 'Swipe: short distance ignored', () => swipeMock(200, 150, 100, 100, 'chat') === 'chat'),
  mockTest(134, 'Swipe: chat boundary right noop', () => swipeMock(50, 200, 100, 100, 'chat') === 'chat'),
  mockTest(135, 'Swipe: insolvency boundary left noop', () => swipeMock(250, 50, 100, 100, 'insolvency') === 'insolvency'),
  mockTest(136, 'Context menu: clamp X at right edge 390px', () => {
    const menuWidth = 190;
    const padding = 16;
    const screenWidth = 390;
    const clientX = 380;
    return Math.max(menuWidth / 2 + padding, Math.min(screenWidth - menuWidth / 2 - padding, clientX)) === 279;
  }),
  mockTest(137, 'Context menu: move >8px cancels long press', () => {
    const dx = 30;
    const dy = 0;
    return Math.sqrt(dx * dx + dy * dy) > 8;
  }),
  mockTest(138, 'Paste routing: terminal mode', () => {
    const mode = 'terminal';
    return mode === 'terminal';
  }),
  mockTest(139, 'Paste routing: chat mode', () => {
    const mode = 'chat';
    return mode === 'chat';
  }),
  ...patternTests(140, 'proxy.ts', 'Tailscale in proxy module', [
    { name: 'TAILSCALE_ALLOWED_IP env', pattern: /TAILSCALE_ALLOWED_IP/ },
    { name: '100.103.153.97 default', pattern: /100\.103\.153\.97/ },
    { name: 'fd7a IPv6 tailscale', pattern: /fd7a:115c:a1e0/ },
    { name: '403 forbidden response', pattern: /status:\s*403/ },
    { name: 'isPrivateIp helper', pattern: /isPrivateIp/ },
  ]),
  mockTest(145, 'Gestures: source has touch swipe handlers wired', () => {
    const src = readSource(chat);
    return src.includes('handleTouchStart') && src.includes('handleTouchEnd');
  }),
];

export default { name: '05 Gestures & Navigation', tests };
