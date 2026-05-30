#!/usr/bin/env node

/**
 * Pandora Quality Smoke Test
 * 
 * Performs production-level quality checks:
 * - Calls POST /api/pandora/projects/create
 * - Fetches export HTML
 * - Asserts VibeCraft URLs are correct
 * - Asserts no forbidden legacy phrases
 * - Asserts barber/product-specific phrases are present
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandBriefFromSentence } from '../src/lib/pandora/briefExpander.js';
import { assertNoLegacyContent } from '../src/lib/pandora/pandoraConnector.js';

// Simple best-effort env parser to support custom ports in local development
function loadEnv() {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const rootDir = path.resolve(__dirname, '..');
    
    for (const file of ['.env.local', '.env']) {
      const filePath = path.join(rootDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const firstEqual = trimmed.indexOf('=');
            if (firstEqual !== -1) {
              const key = trimmed.substring(0, firstEqual).trim();
              const val = trimmed.substring(firstEqual + 1).trim();
              if (key && val && !process.env[key]) {
                process.env[key] = val;
              }
            }
          }
        }
        break;
      }
    }
  } catch (err) {
    // Ignore error, fallback to defaults
  }
}

loadEnv();

const WEB_PORT = process.env.WEB_PORT || process.env.NEXT_PORT || '3000';
const API_ENDPOINT = process.env.PANDORA_API_ENDPOINT || `http://localhost:${WEB_PORT}/api/pandora/projects/create`;
const VIBECRAFT_DOMAIN = 'vibecraft.rubberduck.sk';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Run smoke test for barber booking
 */
async function testBarberBooking() {
  console.log('\n📋 Testing Barber Booking Flow...\n');

  // Step 1: Expand brief from sentence
  console.log('1️⃣ Expanding brief from sentence...');
  const input = 'Dokonala booking landing page, premium effect with liquid glass - barber shop 2025 trends';
  let brief;
  try {
    brief = expandBriefFromSentence(input);
    console.log('   ✅ Brief expanded successfully');
    console.log(`   Project: ${brief.projectName}`);
    console.log(`   Type: ${brief.productType}`);
    console.log(`   Tone: ${brief.preferredTone}`);
  } catch (e) {
    console.error(`   ❌ Failed to expand brief: ${e.message}`);
    return false;
  }

  // Step 2: Call Pandora API
  console.log('\n2️⃣ Creating Pandora project...');
  let result;
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    result = await response.json();
    console.log('   ✅ Project created successfully');
    console.log(`   Request ID: ${result.requestId}`);
    console.log(`   Artifact ID: ${result.artifactId}`);
  } catch (e) {
    console.error(`   ❌ Failed to create project: ${e.message}`);
    console.error(`   (Note: Endpoint may not be available in local dev)`);
    return false;
  }

  // Step 3: Validate response structure
  console.log('\n3️⃣ Validating response structure...');
  try {
    assert(result.requestId, 'Missing requestId');
    assert(result.artifactId, 'Missing artifactId');
    assert(result.previewUrl, 'Missing previewUrl');
    assert(result.exportUrl, 'Missing exportUrl');
    assert(result.schemaVersion === 'web24h_v1', `Invalid schemaVersion: ${result.schemaVersion}`);
    assert(
      result.previewUrl.includes(`https://${VIBECRAFT_DOMAIN}/api/render/`),
      'previewUrl not from VibeCraft'
    );
    assert(
      result.exportUrl.includes(`https://${VIBECRAFT_DOMAIN}/api/render/`),
      'exportUrl not from VibeCraft'
    );
    console.log('   ✅ Response structure is valid');
  } catch (e) {
    console.error(`   ❌ Response validation failed: ${e.message}`);
    return false;
  }

  // Step 4: Fetch export HTML
  console.log('\n4️⃣ Fetching export HTML...');
  let html;
  try {
    const response = await fetch(result.exportUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    html = await response.text();
    console.log(`   ✅ HTML fetched (${html.length} bytes)`);
  } catch (e) {
    console.error(`   ❌ Failed to fetch export: ${e.message}`);
    console.error(`   (Note: VibeCraft endpoint may not be accessible)`);
    return false;
  }

  // Step 5: Check for legacy content
  console.log('\n5️⃣ Checking for legacy content...');
  try {
    assertNoLegacyContent(html);
    console.log('   ✅ No legacy phrases detected');
  } catch (e) {
    console.error(`   ❌ Legacy content check failed: ${e.message}`);
    return false;
  }

  // Step 6: Check for expected barber phrases
  console.log('\n6️⃣ Checking for barber-specific phrases...');
  const isStubMode = result.message?.includes('stub') || !process.env.PANDORA_UPSTREAM_URL;
  if (isStubMode) {
    console.log('   ⚠️ Running in Phase 1 stub mode. Skipping actual phrase matching on mock HTML.');
    return true;
  }

  const expectedPhrases = ['barber', 'booking', 'premium'];
  const missingPhrases = [];

  for (const phrase of expectedPhrases) {
    if (!html.toLowerCase().includes(phrase)) {
      missingPhrases.push(phrase);
    }
  }

  if (missingPhrases.length > 0) {
    console.error(`   ❌ Missing expected phrases: ${missingPhrases.join(', ')}`);
    return false;
  }
  console.log(`   ✅ Found all expected phrases: ${expectedPhrases.join(', ')}`);

  return true;
}

/**
 * Run smoke test for random product type
 */
async function testRandomProduct() {
  console.log('\n📋 Testing Random Product Flow...\n');

  const products = [
    'Landing page for SaaS product',
    'ecommerce store for handmade crafts',
    'Portfolio website for photographer',
  ];

  const product = products[Math.floor(Math.random() * products.length)];
  console.log(`Testing: ${product}`);

  try {
    const brief = expandBriefFromSentence(product);
    console.log('✅ Brief expanded successfully');
    console.log(`   Type: ${brief.productType}`);
    return true;
  } catch (e) {
    console.error(`❌ Failed: ${e.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('\n🔥 Pandora Quality Smoke Tests\n');

  const results = {
    barberBooking: false,
    randomProduct: false,
  };

  // Test 1: Barber Booking (most important)
  try {
    results.barberBooking = await testBarberBooking();
  } catch (e) {
    console.error(`\n❌ Barber booking test error: ${e.message}`);
    results.barberBooking = false;
  }

  // Test 2: Random Product
  try {
    results.randomProduct = await testRandomProduct();
  } catch (e) {
    console.error(`\n❌ Random product test error: ${e.message}`);
    results.randomProduct = false;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Smoke Test Summary');
  console.log('='.repeat(50));
  console.log(`Barber Booking:  ${results.barberBooking ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Random Product:  ${results.randomProduct ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(50) + '\n');

  const totalPassed = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  if (totalPassed < totalTests) {
    console.log(`⚠️  Some tests failed (${totalPassed}/${totalTests})`);
    process.exit(1);
  } else {
    console.log(`✅ All smoke tests passed (${totalPassed}/${totalTests})`);
  }
}

main().catch((error) => {
  console.error('\n💥 Smoke test crash:', error.message);
  process.exit(1);
});
