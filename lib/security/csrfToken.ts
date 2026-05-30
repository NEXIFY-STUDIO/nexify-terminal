/**
 * CSRF Token Generation & Validation
 * Provides secure token generation for CSRF protection
 */

import { randomBytes } from 'crypto';

/**
 * Generates a cryptographically secure CSRF token
 * @returns 32-byte hexadecimal token
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validates CSRF token format
 * Tokens must be 64 character hex strings
 * @param token - Token to validate
 * @returns true if token format is valid
 */
export function isValidCsrfTokenFormat(token: string): boolean {
  if (typeof token !== 'string') {
    return false;
  }
  // CSRF tokens should be 32 bytes (64 hex chars)
  return /^[a-f0-9]{64}$/.test(token);
}

/**
 * Extracts CSRF token from request
 * Checks headers and body in order: X-CSRF-Token, x-csrf-token, body.csrfToken
 * @param req - Request-like object with headers and body
 * @returns Token string or null if not found
 */
export function extractCsrfToken(req: {
  headers?: Record<string, string | string[]>;
  body?: Record<string, unknown>;
}): string | null {
  if (!req) {
    return null;
  }

  // Check headers first (preferred method)
  if (req.headers) {
    const headerToken = req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'];
    if (typeof headerToken === 'string' && headerToken) {
      return headerToken;
    }
  }

  // Check body as fallback
  if (req.body && typeof req.body === 'object' && 'csrfToken' in req.body) {
    const bodyToken = req.body.csrfToken;
    if (typeof bodyToken === 'string' && bodyToken) {
      return bodyToken;
    }
  }

  return null;
}

/**
 * CSRF token store using in-memory storage
 * In production, use server sessions or database
 */
class CsrfTokenStore {
  private tokens = new Map<string, { token: string; createdAt: number }>();
  private readonly maxAge = 60 * 60 * 1000; // 1 hour

  /**
   * Stores a CSRF token for a session
   * @param sessionId - Session identifier
   * @param token - CSRF token
   */
  store(sessionId: string, token: string): void {
    if (!sessionId || !token) {
      return;
    }
    this.tokens.set(sessionId, {
      token,
      createdAt: Date.now(),
    });
  }

  /**
   * Validates a CSRF token
   * @param sessionId - Session identifier
   * @param token - Token to validate
   * @returns true if token is valid and not expired
   */
  validate(sessionId: string, token: string): boolean {
    if (!sessionId || !token) {
      return false;
    }

    const stored = this.tokens.get(sessionId);
    if (!stored) {
      return false;
    }

    // Check expiration
    if (Date.now() - stored.createdAt > this.maxAge) {
      this.tokens.delete(sessionId);
      return false;
    }

    // Compare tokens (timing attack safe comparison)
    return this.timingSafeCompare(stored.token, token);
  }

  /**
   * Timing-safe string comparison
   * Prevents timing attacks on token validation
   * @param a - First string
   * @param b - Second string
   * @returns true if strings match
   */
  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Removes expired tokens
   */
  cleanup(): void {
    const now = Date.now();
    for (const [sessionId, data] of this.tokens.entries()) {
      if (now - data.createdAt > this.maxAge) {
        this.tokens.delete(sessionId);
      }
    }
  }
}

// Global token store instance
export const csrfTokenStore = new CsrfTokenStore();

// Cleanup expired tokens periodically (every 10 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    csrfTokenStore.cleanup();
  }, 10 * 60 * 1000);
}
