/**
 * Input Validation & Sanitization Utilities
 * Provides XSS prevention, SQL injection pattern detection, and safe input validation
 */

/**
 * HTML entities for escaping dangerous characters
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

/**
 * Escapes HTML special characters to prevent XSS
 * @param str - String to escape
 * @returns Escaped string safe for HTML context
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  return str.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitizes user input by removing potentially dangerous content
 * Removes HTML tags, scripts, and suspicious patterns
 * @param input - Raw user input
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove iframe/embed/object tags
    .replace(/<(iframe|embed|object|link|meta|style)[^>]*>/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol (can contain scripts)
    .replace(/data:text\/html/gi, '')
    // Trim whitespace
    .trim();

  return sanitized;
}

/**
 * Validates email format with basic regex
 * @param email - Email to validate
 * @returns true if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates URL format and ensures safe protocols
 * @param url - URL to validate
 * @returns true if valid URL with http/https protocol
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Detects potential SQL injection patterns
 * Returns true if suspicious patterns are detected
 * @param input - Input to check
 * @returns true if SQL injection pattern detected
 */
export function detectSqlInjectionPattern(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  const sqlPatterns = [
    /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|SCRIPT)\b)/i,
    /(--|#|\/\*).*$/,
    /[';"]?\s*(OR|AND)\s*[';"]?/i,
    /xp_|sp_|cmd|powershell/i,
    /(\*|%|_)/,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Validates string length within bounds
 * @param str - String to validate
 * @param min - Minimum length (default 0)
 * @param max - Maximum length (default 1000)
 * @returns true if string length is valid
 */
export function isValidLength(str: string, min = 0, max = 1000): boolean {
  const len = typeof str === 'string' ? str.length : 0;
  return len >= min && len <= max;
}

/**
 * Validates that input contains only alphanumeric characters and safe punctuation
 * @param input - Input to validate
 * @param allowSpaces - Whether to allow spaces (default true)
 * @returns true if input is alphanumeric
 */
export function isAlphanumeric(input: string, allowSpaces = true): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  const pattern = allowSpaces ? /^[a-zA-Z0-9\s\-_\.]+$/ : /^[a-zA-Z0-9\-_\.]+$/;
  return pattern.test(input);
}

/**
 * Validates that input is safe JSON
 * @param input - JSON string to validate
 * @returns Parsed object if valid, null if invalid
 */
export function parseSafeJson<T = unknown>(input: string): T | null {
  if (typeof input !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(input);
    // Ensure parsed result is an object or array, not a primitive
    if (parsed !== null && typeof parsed === 'object') {
      return parsed as T;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Encodes string for safe use in URL parameters
 * @param str - String to encode
 * @returns URL-encoded string
 */
export function encodeUrlParam(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  return encodeURIComponent(str);
}

/**
 * Validates MIME type is in allowed list
 * @param mimeType - MIME type to validate
 * @param allowedTypes - List of allowed MIME types
 * @returns true if MIME type is allowed
 */
export function isAllowedMimeType(
  mimeType: string,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
): boolean {
  if (typeof mimeType !== 'string') {
    return false;
  }
  return allowedTypes.some((type) => mimeType.toLowerCase().startsWith(type.toLowerCase()));
}

/**
 * Validates file size is within limits
 * @param size - File size in bytes
 * @param maxSizeBytes - Maximum allowed size in bytes (default 5MB)
 * @returns true if file size is valid
 */
export function isValidFileSize(size: number, maxSizeBytes = 5 * 1024 * 1024): boolean {
  return typeof size === 'number' && size > 0 && size <= maxSizeBytes;
}

/**
 * Strips all HTML tags from string
 * @param html - HTML string to strip
 * @returns Plain text without tags
 */
export function stripHtmlTags(html: string): string {
  if (typeof html !== 'string') {
    return '';
  }
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Validates input against multiple security checks
 * Combines sanitization, length validation, and injection detection
 * @param input - User input to validate
 * @param options - Validation options
 * @returns Sanitized input if valid, throws error if invalid
 */
export function validateSecureInput(
  input: string,
  options: {
    minLength?: number;
    maxLength?: number;
    allowHtml?: boolean;
    checkSqlInjection?: boolean;
  } = {}
): string {
  const { minLength = 0, maxLength = 1000, allowHtml = false, checkSqlInjection = true } = options;

  // Type check
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Length validation
  if (!isValidLength(input, minLength, maxLength)) {
    throw new Error(`Input length must be between ${minLength} and ${maxLength} characters`);
  }

  // SQL injection check
  if (checkSqlInjection && detectSqlInjectionPattern(input)) {
    throw new Error('Input contains potentially dangerous characters');
  }

  // Sanitization
  let sanitized = input;
  if (!allowHtml) {
    sanitized = sanitizeInput(input);
    if (sanitized !== input) {
      console.warn('[security] HTML content removed from input');
    }
  }

  return sanitized;
}

/**
 * Normalizes user input for consistent processing
 * Trims whitespace and normalizes unicode
 * @param input - Input to normalize
 * @returns Normalized string
 */
export function normalizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input.trim().normalize('NFC');
}
