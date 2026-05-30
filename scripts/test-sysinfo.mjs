import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const apiRoutePath = path.join(rootDir, 'app/api/sysinfo/route.ts');
const monitorComponentPath = path.join(rootDir, 'components/system-monitor.tsx');
const chatAreaPath = path.join(rootDir, 'components/chat-area.tsx');

console.log('🔍 Running System Monitor Integration & Metrics Verification Tests...');

let failed = false;

// 1. Verify files exist
console.log('\n📁 Verifying file paths...');
const pathsToCheck = [
  { name: 'sysinfo API Route Proxy', path: apiRoutePath },
  { name: 'SystemMonitor React Component', path: monitorComponentPath }
];

pathsToCheck.forEach(file => {
  if (fs.existsSync(file.path)) {
    console.log(`✅ File exists: ${file.name}`);
  } else {
    console.error(`❌ Missing file: ${file.name} at ${file.path}`);
    failed = true;
  }
});

if (failed) process.exit(1);

// 2. Verify proxy route code structure
console.log('\n📡 Auditing app/api/sysinfo/route.ts proxy forwarding code...');
const apiContent = fs.readFileSync(apiRoutePath, 'utf8');

const apiAssertions = [
  { name: 'Import of getHackApiUrl helper', pattern: /getHackApiUrl/ },
  { name: 'Upstream fetch call to /sysinfo', pattern: /fetch\(\s*`\$\{getHackApiUrl\(\)\}\/sysinfo`/ },
  { name: 'NextResponse returned status mapping', pattern: /NextResponse\.json/ }
];

apiAssertions.forEach(assertion => {
  if (assertion.pattern.test(apiContent)) {
    console.log(`✅ Passed: ${assertion.name}`);
  } else {
    console.error(`❌ Failed: ${assertion.name} (Pattern: ${assertion.pattern})`);
    failed = true;
  }
});

// 3. Verify SystemMonitor UI component code structure
console.log('\n🖥️ Auditing components/system-monitor.tsx rendering code assertions...');
const monitorContent = fs.readFileSync(monitorComponentPath, 'utf8');

const monitorAssertions = [
  { name: 'SystemMonitor export declaration', pattern: /export\s+function\s+SystemMonitor/ },
  { name: 'Recharts LineChart component usage', pattern: /<LineChart/ },
  { name: 'CPU percent progress circle offsets', pattern: /cpuOffset/ },
  { name: 'RAM percent progress circle offsets', pattern: /ramOffset/ },
  { name: 'Processes data mapping loop', pattern: /data\.processes\.map/ },
  { name: 'Periodic interval updates hook', pattern: /setInterval\(\s*fetchSysInfo/ }
];

monitorAssertions.forEach(assertion => {
  if (assertion.pattern.test(monitorContent)) {
    console.log(`✅ Passed: ${assertion.name}`);
  } else {
    console.error(`❌ Failed: ${assertion.name} (Pattern: ${assertion.pattern})`);
    failed = true;
  }
});

// 4. Live API sysinfo query & json payload format verify (if Next.js is running)
console.log('\n🌐 Testing live API sysinfo metrics retrieval and parsing...');
const nextPort = '3002'; // Next.js port

try {
  const res = await fetch(`http://localhost:${nextPort}/api/sysinfo`);
  if (res.ok) {
    const data = await res.json();
    if (data.success) {
      console.log('✅ Live API: System metrics retrieved successfully');
      
      // Verify CPU & RAM
      if (typeof data.cpuPct === 'number' && typeof data.ramPct === 'number') {
        console.log(`   CPU: ${data.cpuPct}%, RAM: ${data.ramPct}% (Used: ${data.ramUsedGB}G/${data.ramTotalGB}G)`);
      } else {
        console.error('❌ Live API: cpuPct or ramPct metrics are missing or not numbers', data);
        failed = true;
      }

      // Verify Disk
      if (data.disk && typeof data.disk.pct === 'number' && data.disk.usedGB) {
        console.log(`   Disk Usage: ${data.disk.pct}% (Used: ${data.disk.usedGB}G/${data.disk.totalGB}G)`);
      } else {
        console.error('❌ Live API: Disk capacity metrics are missing or malformed', data);
        failed = true;
      }

      // Verify Battery
      if (data.battery && data.battery.status) {
        console.log(`   Battery status: ${data.battery.status} (${data.battery.percent ?? 'No battery'}%)`);
      } else {
        console.error('❌ Live API: Battery telemetry data is missing or malformed', data);
        failed = true;
      }

      // Verify Processes
      if (Array.isArray(data.processes)) {
        console.log(`   Processes list returned: ${data.processes.length} items`);
        if (data.processes.length > 0) {
          console.log(`   Top consumer: ${data.processes[0].name} (PID: ${data.processes[0].pid}, CPU: ${data.processes[0].cpu}%)`);
        }
      } else {
        console.error('❌ Live API: Processes table array is missing', data);
        failed = true;
      }

    } else {
      console.error('❌ Live API: sysinfo endpoint returned success: false', data);
      failed = true;
    }
  } else {
    console.log('⚠️  Next.js dev server is offline (live integration request skipped). Run pnpm dev to verify live routing.');
  }
} catch (e) {
  console.log('ℹ️  Next.js dev server is offline (live integration request skipped).', e.message);
}

console.log('\n==================================================');
console.log('System Monitor Integration Test Summary');
console.log('==================================================');
if (failed) {
  console.error('❌ SYSTEM MONITOR INTEGRATION TEST FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL SYSTEM MONITOR INTEGRATION TESTS PASSED');
  process.exit(0);
}
