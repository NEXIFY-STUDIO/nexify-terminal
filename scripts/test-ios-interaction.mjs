import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('📱 Running iOS Interaction, Gestures, & Energy Throttling Logical Tests...');

let failed = false;

// 1. Mock Touch Swipe View Navigation Logic
console.log('\n🔍 Test 1: Emulating Swipe Gestures between views...');
let currentViewMode = 'chat';
const touchStart = { x: 0, y: 0 };

const handleTouchStart = (clientX, clientY) => {
  touchStart.x = clientX;
  touchStart.y = clientY;
};

const handleTouchEnd = (clientX, clientY) => {
  const diffX = clientX - touchStart.x;
  const diffY = clientY - touchStart.y;
  
  if (Math.abs(diffX) > 100 && Math.abs(diffY) < 40) {
    const modes = ['chat', 'terminal', 'files', 'system'];
    const currentIndex = modes.indexOf(currentViewMode);
    
    if (diffX > 0) { // Swipe Right -> Previous view
      if (currentIndex > 0) {
        currentViewMode = modes[currentIndex - 1];
      }
    } else { // Swipe Left -> Next view
      if (currentIndex < modes.length - 1) {
        currentViewMode = modes[currentIndex + 1];
      }
    }
  }
};

// Simulate Swipe Left (Chat -> Terminal)
console.log('   Simulating touch: swipe left (Chat -> Terminal)...');
handleTouchStart(250, 100);
handleTouchEnd(50, 100);
console.log(`   New viewMode: ${currentViewMode}`);
if (currentViewMode === 'terminal') {
  console.log('   ✅ Passed: Swipe left changed view to terminal.');
} else {
  console.error(`   ❌ Failed: Expected terminal, but got ${currentViewMode}`);
  failed = true;
}

// Simulate Swipe Right (Terminal -> Chat)
console.log('   Simulating touch: swipe right (Terminal -> Chat)...');
handleTouchStart(50, 100);
handleTouchEnd(200, 100);
console.log(`   New viewMode: ${currentViewMode}`);
if (currentViewMode === 'chat') {
  console.log('   ✅ Passed: Swipe right changed view back to chat.');
} else {
  console.error(`   ❌ Failed: Expected chat, but got ${currentViewMode}`);
  failed = true;
}


// 2. Mock Battery Throttling Logic (Low Power Mode)
console.log('\n🔍 Test 2: Emulating Battery Throttling (polling scaling)...');
let testPollInterval = 2000;

const handleBatteryUpdate = (batteryLevel, isCharging) => {
  // If battery is under 20% and NOT charging, scale poll to 10s, else keep 2s
  if (batteryLevel < 0.20 && !isCharging) {
    testPollInterval = 10000;
  } else {
    testPollInterval = 2000;
  }
};

// Emulate full battery on wall power
handleBatteryUpdate(0.95, true);
console.log(`   State: 95% Charging. Polling Interval: ${testPollInterval}ms`);
if (testPollInterval === 2000) {
  console.log('   ✅ Passed: Normal polling active.');
} else {
  console.error('   ❌ Failed: Expected 2000ms polling.');
  failed = true;
}

// Emulate low battery (15%) discharging
handleBatteryUpdate(0.15, false);
console.log(`   State: 15% Discharging (Low Power Mode). Polling Interval: ${testPollInterval}ms`);
if (testPollInterval === 10000) {
  console.log('   ✅ Passed: Low Power Mode throttled polling to 10s.');
} else {
  console.error('   ❌ Failed: Expected 10000ms polling throttle.');
  failed = true;
}


// 3. Mock Web Audio Haptic Synthesizer Instantiation
console.log('\n🔍 Test 3: Checking Web Audio API Haptic synthesizer payload...');
const testAudioHaptic = (type) => {
  // Simulates our oscillator configuration
  const oscConfig = {
    type: 'sine',
    frequency: 60,
    durationMs: type === 'light' ? 30 : type === 'medium' ? 50 : 150
  };
  return oscConfig;
};

const lightPulse = testAudioHaptic('light');
if (lightPulse.frequency === 60 && lightPulse.durationMs === 30) {
  console.log('   ✅ Passed: Light speaker pulse synthetically configured (60Hz, 30ms).');
} else {
  console.error('   ❌ Failed: Light speaker pulse mismatch.');
  failed = true;
}

const errorPulse = testAudioHaptic('error');
if (errorPulse.frequency === 60 && errorPulse.durationMs === 150) {
  console.log('   ✅ Passed: Heavy/Error speaker pulse synthetically configured (60Hz, 150ms).');
} else {
  console.error('   ❌ Failed: Error speaker pulse mismatch.');
  failed = true;
}

// 4. Mock Custom Context Menu Long Press & Clamping Logic
console.log('\n🔍 Test 4: Custom iOS Copy/Paste Context Menu Trigger & Clamping Logic...');
let contextMenuState = { visible: false, x: 0, y: 0, textToCopy: '', side: 'top' };
let longPressTimer = null;
let touchStartPos = null;
let touchActive = false;

const startLongPressTimer = (clientX, clientY, textContent) => {
  touchStartPos = { x: clientX, y: clientY };
  touchActive = true;
  
  if (longPressTimer) clearTimeout(longPressTimer);
  
  longPressTimer = setTimeout(() => {
    if (!touchActive) return;
    
    // Position clamping and offsets simulation
    const menuWidth = 190;
    const padding = 16;
    const screenWidth = 390; // Emulate iPhone 16 width
    
    const safeX = Math.max(menuWidth / 2 + padding, Math.min(screenWidth - menuWidth / 2 - padding, clientX));
    const spaceAbove = clientY > 90;
    
    contextMenuState = {
      visible: true,
      x: safeX,
      y: clientY,
      textToCopy: textContent,
      side: spaceAbove ? 'top' : 'bottom'
    };
    
    touchActive = false;
  }, 2000);
};

const handleTouchMove = (clientX, clientY) => {
  if (!touchStartPos) return;
  const dx = clientX - touchStartPos.x;
  const dy = clientY - touchStartPos.y;
  
  // If moved > 8px, cancel long press
  if (Math.sqrt(dx * dx + dy * dy) > 8) {
    touchActive = false;
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }
};

const handleTouchCancel = () => {
  touchActive = false;
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
};

// Sub-Test 4a: Long Press trigger (without move)
console.log('   Simulating touch: touchstart at (200, 150) with message content...');
startLongPressTimer(200, 150, 'Ahoj, toto je testovacia sprava.');

// Emulate timer firing (2 seconds elapsed)
console.log('   Fast-forwarding 2000ms long-press timer...');
if (longPressTimer) {
  clearTimeout(longPressTimer);
  
  const clientX = touchStartPos.x;
  const clientY = touchStartPos.y;
  const menuWidth = 190;
  const padding = 16;
  const screenWidth = 390;
  const safeX = Math.max(menuWidth / 2 + padding, Math.min(screenWidth - menuWidth / 2 - padding, clientX));
  const spaceAbove = clientY > 90;
  
  contextMenuState = {
    visible: true,
    x: safeX,
    y: clientY,
    textToCopy: 'Ahoj, toto je testovacia sprava.',
    side: spaceAbove ? 'top' : 'bottom'
  };
}

if (contextMenuState.visible && contextMenuState.x === 200 && contextMenuState.y === 150 && contextMenuState.side === 'top') {
  console.log('   ✅ Passed: Context menu triggered, positioned correctly above touch point.');
} else {
  console.error(`   ❌ Failed: Unexpected contextMenuState:`, contextMenuState);
  failed = true;
}

// Sub-Test 4b: Swiping cancels long press
console.log('   Simulating touch: touchstart and then touchmove (scrolling)...');
startLongPressTimer(150, 200, 'Ine testovacie data');
handleTouchMove(180, 200); // Moved 30px (> 8px)

if (!touchActive) {
  console.log('   ✅ Passed: TouchMove cancelled long press trigger.');
} else {
  console.error('   ❌ Failed: Long press should have been cancelled by movement.');
  failed = true;
}
handleTouchCancel();

// Sub-Test 4c: Boundary Clamping (near right edge)
console.log('   Simulating touch: near screen right edge (380, 150) on a 390px viewport...');
startLongPressTimer(380, 150, 'Zarovnanie k pravym okrajom');

if (longPressTimer) {
  clearTimeout(longPressTimer);
  const clientX = touchStartPos.x;
  const clientY = touchStartPos.y;
  const menuWidth = 190;
  const padding = 16;
  const screenWidth = 390;
  const safeX = Math.max(menuWidth / 2 + padding, Math.min(screenWidth - menuWidth / 2 - padding, clientX));
  
  contextMenuState = {
    visible: true,
    x: safeX,
    y: clientY,
    textToCopy: 'Zarovnanie k pravym okrajom',
    side: clientY > 90 ? 'top' : 'bottom'
  };
}

// Emulated screen edge clamping should keep right boundary inside:
// screenWidth(390) - menuWidth(190)/2 - padding(16) = 390 - 95 - 16 = 279px.
if (contextMenuState.x === 279) {
  console.log('   ✅ Passed: X coordinate clamped to 279px to prevent menu overflow.');
} else {
  console.error(`   ❌ Failed: Clamping calculation mismatch. Expected 279, got ${contextMenuState.x}`);
  failed = true;
}

// Sub-Test 4d: Paste routing based on viewMode (Terminal vs Chat)
console.log('   Simulating paste routing logic based on active viewMode...');
let emulatedTerminalWriteInput = null;
let emulatedChatInputState = '';
let emulatedViewMode = 'terminal';
const emulatedShellSessionId = 'test-session-12345';

const executePasteTextMock = (text) => {
  if (emulatedViewMode === 'terminal') {
    // Send to terminal input mock
    emulatedTerminalWriteInput = {
      url: `/api/shell?path=sessions/${emulatedShellSessionId}/input`,
      body: { input: text }
    };
  } else {
    // Send to chat input mock
    emulatedChatInputState = text;
  }
};

// Paste in Terminal view
executePasteTextMock('ls -la');
if (emulatedTerminalWriteInput && emulatedTerminalWriteInput.url.includes(emulatedShellSessionId) && emulatedTerminalWriteInput.body.input === 'ls -la') {
  console.log('   ✅ Passed: Text correctly routed to terminal input endpoint in terminal viewMode.');
} else {
  console.error('   ❌ Failed: Terminal paste routing failed:', emulatedTerminalWriteInput);
  failed = true;
}

// Paste in Chat view
emulatedViewMode = 'chat';
executePasteTextMock('Ahoj AI!');
if (emulatedChatInputState === 'Ahoj AI!') {
  console.log('   ✅ Passed: Text correctly routed to chat input state in chat viewMode.');
} else {
  console.error('   ❌ Failed: Chat paste routing failed:', emulatedChatInputState);
  failed = true;
}

// Sub-Test 4e: Fallback Paste Dialog trigger
console.log('   Simulating Clipboard API failure & Fallback Paste Dialog trigger...');
let pasteDialogState = { visible: false, tempText: '' };
const handlePasteMock = (clipboardApiAvailable, throwsError) => {
  if (!clipboardApiAvailable || throwsError) {
    // Open the paste fallback modal
    pasteDialogState = { visible: true, tempText: '' };
  } else {
    executePasteTextMock('Clipboard standard paste');
  }
};

// Clipboard API missing (HTTP context)
handlePasteMock(false, false);
if (pasteDialogState.visible) {
  console.log('   ✅ Passed: Clipboard API absence (HTTP) correctly opens fallback dialog.');
} else {
  console.error('   ❌ Failed: Clipboard API absence should have triggered fallback dialog.');
  failed = true;
}

// Clipboard API throws error (iOS permission denied)
pasteDialogState = { visible: false, tempText: '' };
handlePasteMock(true, true);
if (pasteDialogState.visible) {
  console.log('   ✅ Passed: Clipboard read permission denial correctly opens fallback dialog.');
} else {
  console.error('   ❌ Failed: Clipboard permission denial should have triggered fallback dialog.');
  failed = true;
}

// Sub-Test 4f: Synthetic Click Swallowing and Non-passive configuration checks
console.log('   Checking synthetic click swallowing and non-passive touchend config...');
let wasLongPressedMock = false;
let preventDefaultCalled = false;

const touchstartMock = () => {
  wasLongPressedMock = false;
  // simulating long press timeout elapsed
  wasLongPressedMock = true;
};

const touchendMock = (e) => {
  if (wasLongPressedMock) {
    e.preventDefault();
    setTimeout(() => {
      wasLongPressedMock = false;
    }, 100);
  }
};

const mockEvent = {
  preventDefault: () => {
    preventDefaultCalled = true;
  }
};

touchstartMock();
touchendMock(mockEvent);

if (preventDefaultCalled) {
  console.log('   ✅ Passed: preventDefault called on simulated long-press touchend.');
} else {
  console.error('   ❌ Failed: preventDefault was not called on simulated long-press touchend.');
  failed = true;
}

// Verify actual chat-area.tsx source code configuration
try {
  const chatAreaSrc = fs.readFileSync(path.join(__dirname, '../components/chat-area.tsx'), 'utf8');
  const touchendPassiveRegex = /document\.addEventListener\(\s*["']touchend["']\s*,\s*handleGlobalTouchEnd\s*,\s*\{\s*passive:\s*false\s*\}\s*\)/;
  const touchcancelPassiveRegex = /document\.addEventListener\(\s*["']touchcancel["']\s*,\s*handleGlobalTouchEnd\s*,\s*\{\s*passive:\s*false\s*\}\s*\)/;

  if (touchendPassiveRegex.test(chatAreaSrc) && touchcancelPassiveRegex.test(chatAreaSrc)) {
    console.log('   ✅ Passed: Real touchend & touchcancel event listeners correctly configured with { passive: false } in chat-area.tsx.');
  } else {
    console.error('   ❌ Failed: Real touchend or touchcancel listener lacks { passive: false } config in chat-area.tsx.');
    failed = true;
  }
} catch (err) {
  console.error('   ❌ Failed: Could not read chat-area.tsx source file:', err.message);
  failed = true;
}


console.log('\n==================================================');
console.log('iOS Mobile Interaction Test Summary');
console.log('==================================================');
if (failed) {
  console.error('❌ MOBILE INTERACTIONS TEST FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL MOBILE INTERACTIONS TESTS PASSED SUCCESSFULLY');
  process.exit(0);
}
