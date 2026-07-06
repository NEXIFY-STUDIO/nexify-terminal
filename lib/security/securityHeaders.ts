/**
 * Security Headers Utilities
 * Provides HSTS, CSP, and other security headers configuration
 */

export interface SecurityHeadersConfig {
  'Strict-Transport-Security': string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Content-Security-Policy': string;
  'Permissions-Policy': string;
}

/**
 * Default security headers for production
 * Provides defense against common web vulnerabilities
 */
export const DEFAULT_SECURITY_HEADERS: SecurityHeadersConfig = {
  // Enforces HTTPS and prevents downgrade attacks
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Prevents MIME type sniffing (prevents IE from rendering files as HTML)
  'X-Content-Type-Options': 'nosniff',

  // Prevents clickjacking attacks
  'X-Frame-Options': 'DENY',

  // Legacy XSS protection header (modern CSP is preferred)
  'X-XSS-Protection': '1; mode=block',

  // Controls referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Content Security Policy - restricts resource loading
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'",

  // Permissions policy - controls browser features
  'Permissions-Policy':
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(self), payment=(), usb=()',
};

/**
 * Lenient security headers for development
 * Allows unsafe-eval and easier debugging
 */
export const DEVELOPMENT_SECURITY_HEADERS: SecurityHeadersConfig = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'no-referrer-when-downgrade',
  'Content-Security-Policy':
    "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https:; style-src 'self' 'unsafe-inline' http: https:; img-src 'self' data: https: http:; font-src 'self' data: http: https:;",
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(self)',
};

/**
 * Gets appropriate security headers based on environment
 * @param isDevelopment - Whether running in development mode
 * @returns Security headers configuration
 */
export function getSecurityHeaders(isDevelopment = false): SecurityHeadersConfig {
  return isDevelopment ? DEVELOPMENT_SECURITY_HEADERS : DEFAULT_SECURITY_HEADERS;
}

/**
 * Formats security headers for use in response headers
 * @param isDevelopment - Whether running in development mode
 * @returns Headers object for response
 */
export function formatSecurityHeaders(isDevelopment = false): Record<string, string> {
  const headers = getSecurityHeaders(isDevelopment);
  return { ...headers };
}

/**
 * Custom CSP builder for more granular control
 */
export class CspBuilder {
  private directives: Map<string, string[]> = new Map();

  constructor(isDevelopment = false) {
    this.setDefaults(isDevelopment);
  }

  /**
   * Sets default CSP directives
   */
  private setDefaults(isDevelopment: boolean): void {
    this.directives.set('default-src', ["'self'"]);
    this.directives.set(
      'script-src',
      isDevelopment
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
        : ["'self'", "'unsafe-inline'"]
    );
    this.directives.set('style-src', ["'self'", "'unsafe-inline'"]);
    this.directives.set('img-src', ["'self'", 'data:', 'https:']);
    this.directives.set('font-src', ["'self'", 'data:']);
    this.directives.set('connect-src', ["'self'", 'https:']);
    this.directives.set('frame-ancestors', ["'none'"]);
  }

  /**
   * Adds a directive to CSP
   */
  addDirective(directive: string, sources: string[]): this {
    this.directives.set(directive, sources);
    return this;
  }

  /**
   * Adds sources to an existing directive
   */
  addSources(directive: string, sources: string[]): this {
    const existing = this.directives.get(directive) || [];
    this.directives.set(directive, [...existing, ...sources]);
    return this;
  }

  /**
   * Builds CSP header value
   */
  build(): string {
    return Array.from(this.directives.entries())
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
  }
}

/**
 * Headers for preventing cache of sensitive content
 */
export const NO_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * Headers for preventing information leakage
 */
export const ANTI_LEAK_HEADERS: Record<string, string> = {
  'X-Powered-By': '',
  'Server': '',
  'X-AspNet-Version': '',
  'X-AspNetMvc-Version': '',
};

/**
 * Combines multiple header objects safely
 * Later headers override earlier ones
 * @param headerArrays - Arrays of header objects to merge
 * @returns Merged headers object
 */
export function mergeHeaders(...headerArrays: Record<string, string>[]): Record<string, string> {
  const merged: Record<string, string> = {};

  for (const headers of headerArrays) {
    if (headers && typeof headers === 'object') {
      for (const [key, value] of Object.entries(headers)) {
        if (typeof value === 'string') {
          merged[key] = value;
        }
      }
    }
  }

  return merged;
}

/**
 * Validates header name format
 * @param name - Header name to validate
 * @returns true if header name is valid
 */
export function isValidHeaderName(name: string): boolean {
  if (typeof name !== 'string') {
    return false;
  }
  // Header names must be alphanumeric with hyphens
  return /^[a-zA-Z0-9\-]+$/.test(name);
}

/**
 * Validates header value format
 * Prevents header injection
 * @param value - Header value to validate
 * @returns true if header value is safe
 */
export function isValidHeaderValue(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  // Prevent header injection with CRLF
  return !value.includes('\r') && !value.includes('\n');
}

/**
 * Safely adds a custom header
 * Validates name and value to prevent injection
 * @param headers - Headers object
 * @param name - Header name
 * @param value - Header value
 * @returns Updated headers object
 */
export function addHeader(
  headers: Record<string, string>,
  name: string,
  value: string
): Record<string, string> {
  if (!isValidHeaderName(name) || !isValidHeaderValue(value)) {
    console.warn(`[security] Invalid header: ${name}`);
    return headers;
  }

  return {
    ...headers,
    [name]: value,
  };
}

/**
 * Creates HTTPS redirect headers
 * Forces all HTTP requests to HTTPS
 * @returns Headers for HTTP to HTTPS redirect
 */
export function getHttpsRedirectHeaders(): Record<string, string> {
  return {
    'Location': 'https://',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  };
}
