#!/usr/bin/env node
/**
 * Live stability + network soak for Nexify Terminal (launchd / Tailscale).
 *
 * Env: MAC_TS, PHONE_TS, PHONE_TS_NAME, NEXIFY_SERVE_URL
 * Flag: --with-kickstart  (destructive launchd relaunch test)
 */
import { execSync } from 'node:child_process';

const MAC_TS = process.env.MAC_TS || process.env.MAC_TS_IP || '100.103.0.38';
const PHONE_TS = process.env.PHONE_TS || process.env.PHONE_TS_IP || '100.90.134.52';
const PHONE_TS_NAME = process.env.PHONE_TS_NAME || 'nothing-phone-1';
const NEXIFY_SERVE_URL = (process.env.NEXIFY_SERVE_URL || 'https://macbook-air-uvatea-erik.tail8c034f.ts.net').replace(/\/$/, '');
const WITH_KICKSTART = process.argv.includes('--with-kickstart');

const HOSTS = [
  { name: 'localhost', base: 'http://127.0.0.1' },
  { name: 'tailscale-mac', base: `http://${MAC_TS}` },
];

const ENDPOINTS = [
  { path: '/', label: 'UI root', ports: [3322] },
  { path: '/api/health', label: 'Next health', ports: [3322] },
  { path: '/health', label: 'Hack API health', ports: [3021] },
  { path: '/health', label: 'AI proxy health', ports: [8788] },
];

const BURST = 30;
let failed = 0;
let passed = 0;

function ok(msg) {
  console.log(`✅ ${msg}`);
  passed++;
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  failed++;
}

async function fetchStatus(url, init = {}) {
  const t0 = performance.now();
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  const ms = Math.round(performance.now() - t0);
  return { status: res.status, ms };
}

console.log('🧪 Nexify stability & network soak\n');
console.log(`   Mac TS: ${MAC_TS} | Phone TS: ${PHONE_TS} (${PHONE_TS_NAME})`);
console.log(`   Serve URL: ${NEXIFY_SERVE_URL}`);
if (WITH_KICKSTART) console.log('   Mode: --with-kickstart (destructive)\n');
else console.log('   Mode: preflight (pass --with-kickstart for relaunch test)\n');

// 1) LaunchAgent
try {
  const list = execSync('launchctl list 2>/dev/null | grep com.nexify.terminal || true', { encoding: 'utf8' });
  if (/^\d+/.test(list.trim())) ok(`LaunchAgent running (${list.trim()})`);
  else fail(`LaunchAgent not running: ${list.trim() || 'missing'}`);
} catch (e) {
  fail(`LaunchAgent check error: ${e.message}`);
}

// 2) Tailscale
try {
  const ip = execSync('tailscale ip -4 2>/dev/null', { encoding: 'utf8' }).trim();
  if (ip === MAC_TS) ok(`Tailscale Mac IP: ${ip}`);
  else fail(`Tailscale IP mismatch: expected ${MAC_TS}, got ${ip}`);
  const status = execSync('tailscale status 2>/dev/null', { encoding: 'utf8' });
  const phoneVisible = status.includes(PHONE_TS) || status.toLowerCase().includes(PHONE_TS_NAME.toLowerCase());
  if (phoneVisible) ok(`Phone on Tailscale mesh (${PHONE_TS} / ${PHONE_TS_NAME})`);
  else fail(`Phone not visible in tailscale status (${PHONE_TS})`);
} catch (e) {
  fail(`Tailscale check error: ${e.message}`);
}

// 3) Tailscale Serve (phone path)
console.log('\n📡 Tailscale Serve (phone HTTPS path)');
try {
  const { status, ms } = await fetchStatus(`${NEXIFY_SERVE_URL}/api/health`);
  if (status >= 200 && status < 400) ok(`Serve health ${status} (${ms}ms)`);
  else fail(`Serve health HTTP ${status} (${ms}ms)`);
} catch (e) {
  fail(`Serve health — ${e.message}`);
}

// 4) Endpoint matrix
console.log('\n📡 Endpoint matrix');
for (const host of HOSTS) {
  for (const ep of ENDPOINTS) {
    for (const port of ep.ports) {
      const url = `${host.base}:${port}${ep.path}`;
      try {
        const { status, ms } = await fetchStatus(url);
        if (status >= 200 && status < 400) ok(`${host.name} ${ep.label} ${status} (${ms}ms)`);
        else fail(`${host.name} ${ep.label} HTTP ${status} (${ms}ms)`);
      } catch (e) {
        fail(`${host.name} ${ep.label} — ${e.message}`);
      }
    }
  }
}

// 5) Burst stability on UI (Tailscale path = phone path)
console.log(`\n🔁 Burst ${BURST}× UI via Tailscale IP (phone path)`);
const latencies = [];
let burstFail = 0;
for (let i = 0; i < BURST; i++) {
  try {
    const { status, ms } = await fetchStatus(`http://${MAC_TS}:3322/`);
    latencies.push(ms);
    if (status !== 200) burstFail++;
  } catch {
    burstFail++;
  }
}
if (burstFail === 0) {
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const max = latencies[latencies.length - 1];
  ok(`Burst ${BURST}/${BURST} OK — p50=${p50}ms p95=${p95}ms max=${max}ms`);
} else {
  fail(`Burst failures: ${burstFail}/${BURST}`);
}

// 6) Process survival after burst
try {
  const pids = execSync('lsof -t -i :3322 -i :3021 -i :8788 2>/dev/null | sort -u | wc -l', { encoding: 'utf8' }).trim();
  if (Number(pids) >= 3) ok(`All service ports still bound (${pids} PIDs)`);
  else fail(`Missing listeners after burst (PIDs: ${pids})`);
} catch (e) {
  fail(`Port check after burst: ${e.message}`);
}

// 7) Launchd relaunch recovery (optional)
if (WITH_KICKSTART) {
  console.log('\n🔄 Launchd kickstart recovery test');
  const uid = execSync('id -u', { encoding: 'utf8' }).trim();
  try {
    execSync(`launchctl kickstart -k gui/${uid}/com.nexify.terminal`, { stdio: 'pipe' });
    await new Promise((r) => setTimeout(r, 12000));
    const { status, ms } = await fetchStatus(`http://${MAC_TS}:3322/`);
    if (status === 200) ok(`Recovered after kickstart in ${ms}ms`);
    else fail(`Post-kickstart HTTP ${status}`);
    const list2 = execSync('launchctl list 2>/dev/null | grep com.nexify.terminal || true', { encoding: 'utf8' });
    if (/^\d+/.test(list2.trim())) ok(`LaunchAgent still registered after kickstart`);
    else fail('LaunchAgent missing after kickstart');
  } catch (e) {
    fail(`Kickstart recovery: ${e.message}`);
  }
} else {
  console.log('\n⏭️  Skipping kickstart test (pass --with-kickstart to enable)');
}

// 8) Security note (dev lockdown behavior)
console.log('\n🛡️ Network lock (dev mode note)');
try {
  const allowed = await fetchStatus('http://127.0.0.1:3322/', { headers: { 'x-forwarded-for': PHONE_TS } });
  const blocked = await fetchStatus('http://127.0.0.1:3322/', { headers: { 'x-forwarded-for': '8.8.8.8' } });
  if (allowed.status === 200) ok(`Authorized client IP (${PHONE_TS}) → ${allowed.status}`);
  if (blocked.status === 403) ok(`Public IP spoof blocked → 403`);
  else fail(`Public IP spoof returned ${blocked.status} (dev may auto-allow private/Tailscale ranges)`);
} catch (e) {
  fail(`Lockdown probe: ${e.message}`);
}

console.log('\n==================================================');
console.log(`Stability summary: ${passed} passed, ${failed} failed`);
console.log('==================================================');
process.exit(failed > 0 ? 1 : 0);
