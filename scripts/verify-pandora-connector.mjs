#!/usr/bin/env node

/**
 * Pandora Connector Verification Script
 * 
 * Tests:
 * - expandBriefFromSentence()
 * - normalizeBrief()
 * - validateBriefCore()
 * - Response validation with mock good response
 * - Response validation with wrong domain
 * - Legacy phrase detection
 * - Barber booking expected output
 */

import {
  expandBriefFromSentence,
} from '../src/lib/pandora/briefExpander.js';
import {
  normalizeBrief,
  validateBriefCore,
  FORBIDDEN_LEGACY_PHRASES,
} from '../src/lib/pandora/pandoraSchema.js';
import {
  validatePandoraCreateResponse as validateResponse,
  assertNoLegacyContent,
} from '../src/lib/pandora/pandoraConnector.js';

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, but got ${actual}`
    );
  }
}

function assertIncludes(arr, value, message) {
  if (!arr.includes(value)) {
    throw new Error(
      message || `Expected array to include ${value}`
    );
  }
}

// Test 1: expandBriefFromSentence basic functionality
test('expandBriefFromSentence extracts barber booking brief', () => {
  const input =
    'Dokonala booking landing page, premium effect with liquid glass - barber shop 2025 trends';
  const result = expandBriefFromSentence(input);

  assert(result.projectName, 'projectName should be present');
  assert(result.goal, 'goal should be present');
  assert(result.description, 'description should be present');
  assert(result.contactEmail, 'contactEmail should be present');
  assertEquals(result.productType, 'landing-page');
  assertEquals(result.preferredTone, 'premium');
  assertIncludes(result.description.toLowerCase(), 'barber');
});

// Test 2: normalizeBrief validates required fields
test('normalizeBrief enforces required fields', () => {
  const validBrief = {
    projectName: 'Test Project',
    goal: 'Test Goal',
    description: 'Test Description',
    contactEmail: 'test@example.com',
  };

  const normalized = normalizeBrief(validBrief);
  assert(normalized.projectName, 'projectName should be present');
  assertEquals(normalized.productType, 'landing-page');
});

// Test 3: normalizeBrief rejects missing projectName
test('normalizeBrief throws on missing projectName', () => {
  const invalidBrief = {
    goal: 'Test Goal',
    description: 'Test Description',
    contactEmail: 'test@example.com',
  };

  try {
    normalizeBrief(invalidBrief);
    throw new Error('Should have thrown');
  } catch (e) {
    assert(
      e.message.includes('projectName'),
      'Error should mention projectName'
    );
  }
});

// Test 4: validateBriefCore checks required fields
test('validateBriefCore validates core fields', () => {
  const validBrief = {
    projectName: 'Test',
    goal: 'Goal',
    description: 'Desc',
    contactEmail: 'test@example.com',
  };

  const validation = validateBriefCore(validBrief);
  assertEquals(validation.valid, true);
});

// Test 5: validateBriefCore detects invalid email
test('validateBriefCore detects invalid email', () => {
  const invalidBrief = {
    projectName: 'Test',
    goal: 'Goal',
    description: 'Desc',
    contactEmail: 'not-an-email',
  };

  const validation = validateBriefCore(invalidBrief);
  assertEquals(validation.valid, false);
  assert(validation.errors.length > 0);
});

// Test 6: Response validation with valid response
test('validatePandoraCreateResponse accepts valid response', () => {
  const validResponse = {
    requestId: 'req-123',
    artifactId: 'art-456',
    previewUrl: 'https://vibecraft.rubberduck.sk/api/render/preview-xyz',
    exportUrl: 'https://vibecraft.rubberduck.sk/api/render/export-xyz',
    schemaVersion: 'web24h_v1',
  };

  const validation = validateResponse(validResponse);
  assertEquals(validation.ok, true);
});

// Test 7: Response validation with wrong domain
test('validatePandoraCreateResponse rejects wrong domain', () => {
  const invalidResponse = {
    requestId: 'req-123',
    artifactId: 'art-456',
    previewUrl: 'https://wrong-domain.com/api/render/preview-xyz',
    exportUrl: 'https://vibecraft.rubberduck.sk/api/render/export-xyz',
    schemaVersion: 'web24h_v1',
  };

  const validation = validateResponse(invalidResponse);
  assertEquals(validation.ok, false);
  assertEquals(validation.stage, 'connector_contract_failed');
});

// Test 8: Response validation with missing fields
test('validatePandoraCreateResponse rejects missing fields', () => {
  const invalidResponse = {
    requestId: 'req-123',
    // missing artifactId, urls, schemaVersion
  };

  const validation = validateResponse(invalidResponse);
  assertEquals(validation.ok, false);
});

// Test 9: Legacy phrase detection
test('assertNoLegacyContent detects forbidden phrases', () => {
  const html = 'This is a normal page with Web24h Project inside.';
  try {
    assertNoLegacyContent(html);
    throw new Error('Should have thrown');
  } catch (e) {
    assert(
      e.message.includes('forbidden'),
      'Error should mention forbidden phrases'
    );
  }
});

// Test 10: Legacy phrase detection - clean HTML
test('assertNoLegacyContent passes clean HTML', () => {
  const html = 'This is a normal barber shop page with booking and services.';
  try {
    assertNoLegacyContent(html);
  } catch (e) {
    throw new Error(`Clean HTML should pass: ${e.message}`);
  }
});

// Test 11: Barber booking inference
test('expandBriefFromSentence infers barber booking correctly', () => {
  const input = 'booking page for barber shop with premium liquid glass';
  const result = expandBriefFromSentence(input);

  assertEquals(result.productType, 'landing-page');
  assertEquals(result.preferredTone, 'premium');
  assertEquals(result.ctaStyle, 'direct');
  assertIncludes(result.goal.toLowerCase(), 'barber');
});

// Test 12: Default email when not provided
test('expandBriefFromSentence defaults to hello@example.com', () => {
  const input = 'booking page for barber shop';
  const result = expandBriefFromSentence(input);
  assertEquals(result.contactEmail, 'hello@example.com');
});

// Test 13: Extract email from input
test('expandBriefFromSentence extracts email from input', () => {
  const input = 'booking page for barber contact@barber.com';
  const result = expandBriefFromSentence(input);
  assertEquals(result.contactEmail, 'contact@barber.com');
});

// Test 14: Forbidden phrases list is not empty
test('FORBIDDEN_LEGACY_PHRASES is populated', () => {
  assert(FORBIDDEN_LEGACY_PHRASES.length > 0, 'Should have forbidden phrases');
  assertIncludes(FORBIDDEN_LEGACY_PHRASES, 'web24h');
  assertIncludes(FORBIDDEN_LEGACY_PHRASES, 'Web24h Project');
});

// Run all tests
console.log('\n🧪 Running Pandora Connector Verification Tests...\n');

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Tests Passed: ${passed}/${tests.length}`);
console.log(`Tests Failed: ${failed}/${tests.length}`);
console.log(`${'='.repeat(50)}\n`);

if (failed > 0) {
  process.exit(1);
}
