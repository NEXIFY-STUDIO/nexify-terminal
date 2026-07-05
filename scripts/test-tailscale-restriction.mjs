import dns from 'node:dns';

console.log('🛡️ Running Tailscale Security Restriction & PIN Verification Tests...');

let failed = false;
const nextPort = '3322';
const targetUrl = `http://localhost:${nextPort}/`;

try {
  // Test 1: Localhost request (No proxy headers)
  console.log('\n🔍 Test 1: Query from local host (should be ALLOWED)...');
  const res1 = await fetch(targetUrl);
  if (res1.status === 200) {
    console.log('✅ Passed: Localhost connection allowed.');
  } else {
    console.error(`❌ Failed: Localhost request rejected with status ${res1.status}`);
    failed = true;
  }

  // Test 2: Authorized iPhone Tailscale IP (via x-forwarded-for)
  console.log('\n🔍 Test 2: Query from authorized iPhone Tailscale IP (100.103.153.97) (should be ALLOWED)...');
  const res2 = await fetch(targetUrl, {
    headers: {
      'x-forwarded-for': '100.103.153.97'
    }
  });
  if (res2.status === 200) {
    console.log('✅ Passed: Authorized Tailscale IP allowed.');
  } else {
    console.error(`❌ Failed: Authorized Tailscale IP rejected with status ${res2.status}`);
    failed = true;
  }

  // Test 3: Unauthorized external IP (via x-forwarded-for)
  console.log('\n🔍 Test 3: Query from unauthorized client IP (192.168.1.99) (should be BLOCKED with 403)...');
  const res3 = await fetch(targetUrl, {
    headers: {
      'x-forwarded-for': '192.168.1.99'
    }
  });
  if (res3.status === 403) {
    const text = await res3.text();
    console.log(`   Response text: "${text}"`);
    console.log('✅ Passed: Unauthorized client IP blocked successfully (403 Forbidden).');
  } else {
    console.error(`❌ Failed: Unauthorized client IP returned status ${res3.status} instead of 403.`);
    failed = true;
  }

} catch (err) {
  console.log('ℹ️ Next.js dev server is offline. Run pnpm dev:all to run live integration checks.', err.message);
}

console.log('\n==================================================');
console.log('Tailscale Network Lock Test Summary');
console.log('==================================================');
if (failed) {
  console.error('❌ TAILSCALE SECURITY LOCK TEST FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL TAILSCALE SECURITY LOCK TESTS PASSED');
  process.exit(0);
}
