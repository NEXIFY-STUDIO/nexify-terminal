/**
 * Secure Error Handling Utilities
 * Provides safe error responses without leaking sensitive information
 */

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export class SecurityError extends Error {
  code: string;
  statusCode: number;
  isDev: boolean;

  constructor(
    message: string,
    code: string = 'SECURITY_ERROR',
    statusCode: number = 400,
    isDev: boolean = process.env.NODE_ENV === 'development'
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isDev = isDev;
    this.name = 'SecurityError';

    // Log error for monitoring
    if (typeof console !== 'undefined') {
      console.error(`[${this.code}] ${message}`);
    }
  }
}

/**
 * Validates error is a known, safe type
 * Returns generic error response if unknown error
 * @param error - Error to validate
 * @returns Error response with safe message
 */
export function sanitizeError(error: unknown): ErrorResponse {
  const isDev = process.env.NODE_ENV === 'development';

  if (error instanceof SecurityError) {
    return {
      error: {
        code: error.code,
        message: isDev ? error.message : error.message.split('\n')[0], // Only first line in prod
      },
    };
  }

  if (error instanceof Error) {
    // Never expose stack traces or full error messages in production
    if (isDev) {
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      };
    }

    // Production: generic message
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
      },
    };
  }

  if (typeof error === 'string') {
    return {
      error: {
        code: 'UNKNOWN_ERROR',
        message: isDev ? error : 'An error occurred.',
      },
    };
  }

  return {
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred.',
    },
  };
}

/**
 * Validates request object for common attack patterns
 * @param body - Request body to validate
 * @returns true if request appears valid
 */
export function isValidRequestBody(body: unknown): boolean {
  if (!body || typeof body !== 'object') {
    return false;
  }

  // Check body size
  const bodyStr = JSON.stringify(body);
  if (bodyStr.length > 1024 * 1024) {
    // 1MB limit
    return false;
  }

  // Check for suspicious nested structures
  const depth = getObjectDepth(body as Record<string, unknown>);
  if (depth > 10) {
    return false;
  }

  return true;
}

/**
 * Calculates depth of nested object
 * Helps detect deeply nested JSON bombs
 * @param obj - Object to check
 * @param currentDepth - Current depth (default 0)
 * @returns Maximum depth found
 */
function getObjectDepth(obj: Record<string, unknown>, currentDepth = 0): number {
  if (typeof obj !== 'object' || obj === null) {
    return currentDepth;
  }

  let maxDepth = currentDepth;

  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      const depth = getObjectDepth(value as Record<string, unknown>, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }
  }

  return maxDepth;
}

/**
 * Creates a safe error response for API endpoints
 * @param statusCode - HTTP status code
 * @param message - User-safe error message
 * @param code - Error code for client
 * @returns JSON response with error
 */
export function createErrorResponse(statusCode: number, message: string, code = 'ERROR'): {
  statusCode: number;
  body: ErrorResponse;
} {
  return {
    statusCode,
    body: {
      error: {
        code,
        message,
      },
    },
  };
}

/**
 * HTTP status code messages (non-leaking)
 */
export const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request',
  401: 'Authentication required',
  403: 'Access denied',
  404: 'Not found',
  405: 'Method not allowed',
  408: 'Request timeout',
  409: 'Conflict',
  413: 'Payload too large',
  414: 'URI too long',
  415: 'Unsupported media type',
  429: 'Too many requests',
  500: 'Internal server error',
  501: 'Not implemented',
  502: 'Service unavailable',
  503: 'Service unavailable',
  504: 'Service unavailable',
};

/**
 * Gets safe HTTP status message
 * Returns generic message if status not recognized
 * @param statusCode - HTTP status code
 * @returns Safe message for status code
 */
export function getSafeStatusMessage(statusCode: number): string {
  return HTTP_STATUS_MESSAGES[statusCode] || 'An error occurred';
}

/**
 * Logs error with safe information (no sensitive data)
 * @param error - Error to log
 * @param context - Context information (request info, etc.)
 */
export function logSecurityError(
  error: Error,
  context: Record<string, unknown> = {}
): void {
  if (typeof console === 'undefined') {
    return;
  }

  const isDev = process.env.NODE_ENV === 'development';
  const timestamp = new Date().toISOString();

  // Sanitize context - remove sensitive fields
  const sanitizedContext = { ...context };
  delete (sanitizedContext as Record<string, unknown>)['password'];
  delete (sanitizedContext as Record<string, unknown>)['token'];
  delete (sanitizedContext as Record<string, unknown>)['authorization'];

  const logMessage = {
    timestamp,
    error: error.message,
    code: (error as SecurityError).code || 'UNKNOWN',
    ...sanitizedContext,
  };

  if (isDev) {
    console.error('[SECURITY]', logMessage, error.stack);
  } else {
    console.error('[SECURITY]', logMessage);
  }
}

/**
 * Validates content type header
 * @param contentType - Content-Type header value
 * @param allowed - List of allowed MIME types
 * @returns true if content type is allowed
 */
export function isAllowedContentType(
  contentType: string,
  allowed: string[] = ['application/json', 'text/plain']
): boolean {
  if (typeof contentType !== 'string') {
    return false;
  }

  // Extract MIME type without charset
  const mimeType = contentType.split(';')[0].trim().toLowerCase();
  return allowed.some((type) => mimeType === type.toLowerCase());
}

/**
 * Validates request headers for required security headers
 * @param headers - Request headers object
 * @returns true if all required headers present
 */
export function hasRequiredSecurityHeaders(headers: Record<string, string | string[]>): boolean {
  if (!headers || typeof headers !== 'object') {
    return false;
  }

  // Content-Type is required for POST/PUT/PATCH
  return !!headers['content-type'];
}

/**
 * Gets error status code for response
 * Maps error types to appropriate HTTP status codes
 * @param error - Error object
 * @returns HTTP status code
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof SecurityError) {
    return error.statusCode;
  }

  if (error instanceof Error) {
    // Check error message for hints
    if (error.message.includes('not found')) {
      return 404;
    }
    if (error.message.includes('unauthorized') || error.message.includes('auth')) {
      return 401;
    }
    if (error.message.includes('forbidden')) {
      return 403;
    }
  }

  return 500;
}

/**
 * Redacts sensitive fields from object
 * Used for logging objects safely
 * @param obj - Object to redact
 * @returns New object with sensitive fields removed
 */
export function redactSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...obj };
  const sensitiveFields = [
    'password',
    'token',
    'authorization',
    'api_key',
    'apiKey',
    'secret',
    'ssn',
    'creditCard',
    'cvv',
  ];

  for (const field of sensitiveFields) {
    if (field in redacted) {
      redacted[field] = '[REDACTED]';
    }
  }

  return redacted;
}
