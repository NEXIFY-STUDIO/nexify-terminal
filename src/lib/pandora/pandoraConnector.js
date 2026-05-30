/**
 * Pandora Connector
 * 
 * Handles API calls to the Pandora backend, response validation,
 * and quality assurance checks.
 */

import { FORBIDDEN_LEGACY_PHRASES } from './pandoraSchema.js';

const PANDORA_API_ENDPOINT = process.env.PANDORA_API_ENDPOINT || '/api/pandora/projects/create';
const VIBECRAFT_DOMAIN = 'vibecraft.rubberduck.sk';

/**
 * Known failure stages from Pandora backend
 */
export const KNOWN_STAGES = [
  'validation_failed',
  'magic_assist_failed',
  'le_generate_failed',
  'render_failed',
  'upstream_timeout',
  'rate_limited',
  'project_create_failed',
  'connector_contract_failed',
];

/**
 * Create a Pandora project by sending a normalized brief to the backend
 * 
 * @param {Object} brief - Normalized brief object
 * @returns {Promise<Object>} - API response with validation status
 */
export async function createPandoraProject(brief) {
  if (!brief || typeof brief !== 'object') {
    return {
      ok: false,
      stage: 'connector_contract_failed',
      message: 'Invalid brief object',
    };
  }

  try {
    const response = await fetch(PANDORA_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ brief }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        stage: 'project_create_failed',
        requestId: data.requestId,
        message: data.message || 'Failed to create project',
      };
    }

    // Validate the response contract
    const validation = validatePandoraCreateResponse(data);
    if (!validation.ok) {
      return validation;
    }

    return {
      ok: true,
      requestId: data.requestId,
      artifactId: data.artifactId,
      previewUrl: data.previewUrl,
      exportUrl: data.exportUrl,
      productType: data.productType,
      schemaVersion: data.schemaVersion,
    };
  } catch (error) {
    return {
      ok: false,
      stage: 'connector_contract_failed',
      message: `Request failed: ${error.message}`,
    };
  }
}

/**
 * Validate Pandora API response structure and content
 * 
 * Hard validation checks:
 * - status must be ready
 * - schemaVersion must be web24h_v1
 * - artifactId required
 * - previewUrl must include VibeCraft domain
 * - exportUrl must include VibeCraft domain
 */
export function validatePandoraCreateResponse(response) {
  if (!response || typeof response !== 'object') {
    return {
      ok: false,
      stage: 'connector_contract_failed',
      message: 'Response is not an object',
    };
  }

  const errors = [];

  // Check required fields
  if (!response.requestId) {
    errors.push('Missing requestId');
  }
  if (!response.artifactId) {
    errors.push('Missing artifactId');
  }
  if (!response.previewUrl) {
    errors.push('Missing previewUrl');
  }
  if (!response.exportUrl) {
    errors.push('Missing exportUrl');
  }
  if (!response.schemaVersion) {
    errors.push('Missing schemaVersion');
  }

  // Check schema version
  if (response.schemaVersion !== 'web24h_v1') {
    errors.push(`Invalid schemaVersion: expected web24h_v1, got ${response.schemaVersion}`);
  }

  // Check VibeCraft URLs
  if (!response.previewUrl?.includes(`https://${VIBECRAFT_DOMAIN}/api/render/`)) {
    errors.push(`previewUrl must include VibeCraft domain: https://${VIBECRAFT_DOMAIN}/api/render/`);
  }
  if (!response.exportUrl?.includes(`https://${VIBECRAFT_DOMAIN}/api/render/`)) {
    errors.push(`exportUrl must include VibeCraft domain: https://${VIBECRAFT_DOMAIN}/api/render/`);
  }

  if (errors.length > 0) {
    return {
      ok: false,
      stage: 'connector_contract_failed',
      requestId: response.requestId,
      message: errors.join('; '),
    };
  }

  return {
    ok: true,
  };
}

/**
 * Normalize error messages from Pandora backend
 */
export function normalizePandoraError(error) {
  if (!error) {
    return {
      stage: 'unknown',
      message: 'Unknown error',
    };
  }

  const stage = error.stage || 'unknown';
  const message = error.message || 'An error occurred';

  return {
    stage: KNOWN_STAGES.includes(stage) ? stage : 'unknown',
    message,
    requestId: error.requestId,
  };
}

/**
 * Assert that URLs are from VibeCraft domain
 */
export function assertVibeCraftUrls(result) {
  if (!result) {
    throw new Error('Result is required');
  }

  const errors = [];

  if (!result.previewUrl?.includes(`https://${VIBECRAFT_DOMAIN}/api/render/`)) {
    errors.push('previewUrl is not from VibeCraft domain');
  }

  if (!result.exportUrl?.includes(`https://${VIBECRAFT_DOMAIN}/api/render/`)) {
    errors.push('exportUrl is not from VibeCraft domain');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return true;
}

/**
 * Assert that HTML does not contain legacy web24h/WordPress content
 */
export function assertNoLegacyContent(html) {
  if (!html || typeof html !== 'string') {
    throw new Error('HTML must be a non-empty string');
  }

  const foundPhrases = [];

  FORBIDDEN_LEGACY_PHRASES.forEach((phrase) => {
    // Case-insensitive search
    if (html.toLowerCase().includes(phrase.toLowerCase())) {
      foundPhrases.push(phrase);
    }
  });

  if (foundPhrases.length > 0) {
    throw new Error(
      `Found forbidden legacy phrases in HTML: ${foundPhrases.join(', ')}`
    );
  }

  return true;
}

/**
 * Fetch and validate export HTML from VibeCraft URL
 * 
 * This performs a full quality check:
 * - Fetches the HTML from the exportUrl
 * - Asserts no legacy content
 * - Checks for expected product-specific phrases
 */
export async function fetchAndValidateExportHTML(exportUrl, expectedPhrases = []) {
  if (!exportUrl || !exportUrl.includes(VIBECRAFT_DOMAIN)) {
    throw new Error(`Invalid export URL: must be from ${VIBECRAFT_DOMAIN}`);
  }

  try {
    const response = await fetch(exportUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch export: ${response.statusText}`);
    }

    const html = await response.text();

    // Check for legacy content
    assertNoLegacyContent(html);

    // Check for expected phrases if provided
    if (expectedPhrases.length > 0) {
      const missingPhrases = expectedPhrases.filter(
        (phrase) => !html.toLowerCase().includes(phrase.toLowerCase())
      );

      if (missingPhrases.length > 0) {
        throw new Error(
          `Missing expected phrases in HTML: ${missingPhrases.join(', ')}`
        );
      }
    }

    return html;
  } catch (error) {
    throw new Error(`Export validation failed: ${error.message}`);
  }
}
