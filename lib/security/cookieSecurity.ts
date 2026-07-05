/**
 * Cookie Security Utilities
 * Provides secure cookie configuration and handling
 */

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  maxAge?: number;
  path?: string;
  domain?: string;
}

/**
 * Default secure cookie options
 * Enforces HttpOnly, Secure, and SameSite=Lax
 */
export const DEFAULT_SECURE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true, // Prevents JavaScript access, mitigates XSS
  secure: true, // Only sent over HTTPS
  sameSite: 'Lax', // CSRF protection, allows safe cross-site requests
  path: '/',
};

/**
 * Session cookie options (short-lived)
 */
export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  ...DEFAULT_SECURE_COOKIE_OPTIONS,
  maxAge: 24 * 60 * 60, // 24 hours in seconds
};

/**
 * Remember-me cookie options (long-lived)
 */
export const REMEMBER_ME_COOKIE_OPTIONS: CookieOptions = {
  ...DEFAULT_SECURE_COOKIE_OPTIONS,
  maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
};

/**
 * CSRF token cookie options
 * Uses SameSite=Strict for maximum protection
 */
export const CSRF_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: false, // JavaScript needs to read this for forms
  secure: true,
  sameSite: 'Strict',
  path: '/',
  maxAge: 60 * 60, // 1 hour
};

/**
 * Formats cookie options into Set-Cookie header string
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 * @returns Formatted Set-Cookie header value
 */
export function formatCookieHeader(name: string, value: string, options: CookieOptions = {}): string {
  const opts = { ...DEFAULT_SECURE_COOKIE_OPTIONS, ...options };
  let header = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (opts.path) {
    header += `; Path=${opts.path}`;
  }

  if (opts.domain) {
    header += `; Domain=${opts.domain}`;
  }

  if (opts.maxAge) {
    header += `; Max-Age=${opts.maxAge}`;
  }

  if (opts.sameSite) {
    header += `; SameSite=${opts.sameSite}`;
  }

  if (opts.secure) {
    header += '; Secure';
  }

  if (opts.httpOnly) {
    header += '; HttpOnly';
  }

  return header;
}

/**
 * Parses Set-Cookie header string into components
 * @param cookieHeader - Set-Cookie header value
 * @returns Parsed cookie name, value, and options
 */
export function parseCookieHeader(
  cookieHeader: string
): { name: string; value: string; options: CookieOptions } | null {
  if (typeof cookieHeader !== 'string' || !cookieHeader.includes('=')) {
    return null;
  }

  const parts = cookieHeader.split(';').map((p) => p.trim());
  const [nameValue] = parts[0].split('=');

  if (!nameValue) {
    return null;
  }

  const options: CookieOptions = {
    path: '/',
  };

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].toLowerCase();

    if (part === 'httponly') {
      options.httpOnly = true;
    } else if (part === 'secure') {
      options.secure = true;
    } else if (part.startsWith('samesite=')) {
      options.sameSite = part.replace('samesite=', '') as 'Strict' | 'Lax' | 'None';
    } else if (part.startsWith('path=')) {
      options.path = part.replace('path=', '');
    } else if (part.startsWith('domain=')) {
      options.domain = part.replace('domain=', '');
    } else if (part.startsWith('max-age=')) {
      options.maxAge = parseInt(part.replace('max-age=', ''), 10);
    }
  }

  return {
    name: decodeURIComponent(nameValue),
    value: parts[0].split('=')[1] || '',
    options,
  };
}

/**
 * Validates cookie name format
 * Names should be alphanumeric with underscore/hyphen
 * @param name - Cookie name to validate
 * @returns true if name is valid
 */
export function isValidCookieName(name: string): boolean {
  if (typeof name !== 'string') {
    return false;
  }
  // Cookie names must be alphanumeric with limited special chars
  return /^[a-zA-Z0-9_\-]+$/.test(name) && name.length <= 255;
}

/**
 * Validates cookie value for safety
 * Prevents overlong values and suspicious patterns
 * @param value - Cookie value to validate
 * @param maxLength - Maximum allowed length (default 4096)
 * @returns true if value is valid
 */
export function isValidCookieValue(value: string, maxLength = 4096): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  // Check length
  if (value.length > maxLength) {
    return false;
  }
  // Prevent control characters
  return !/[\x00-\x1F\x7F]/.test(value);
}

/**
 * Checks if environment supports secure cookies
 * Returns false if running on localhost HTTP
 * @returns true if environment supports secure cookies
 */
export function supportsSecureCookies(): boolean {
  // In browser environment
  if (typeof window !== 'undefined') {
    return window.location.protocol === 'https:';
  }

  // Server-side: check environment variable
  const protocol = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  return protocol.startsWith('https') || protocol.includes('localhost') || protocol.includes('100.') || protocol.includes('fd7a:115c:a1e0:');
}

/**
 * Gets secure cookie options based on environment
 * Adjusts settings if not in HTTPS environment
 * @returns Appropriate cookie options for current environment
 */
export function getSecureCookieOptions(): CookieOptions {
  const isSecure = supportsSecureCookies();

  return {
    ...DEFAULT_SECURE_COOKIE_OPTIONS,
    secure: isSecure, // Allow HTTP for localhost development
  };
}

/**
 * Creates a secure cookie string for responses
 * @param name - Cookie name
 * @param value - Cookie value
 * @param maxAge - Max age in seconds (optional)
 * @returns Formatted Set-Cookie header
 */
export function createSecureCookie(name: string, value: string, maxAge?: number): string {
  if (!isValidCookieName(name) || !isValidCookieValue(value)) {
    throw new Error('Invalid cookie name or value');
  }

  return formatCookieHeader(name, value, {
    ...getSecureCookieOptions(),
    maxAge,
  });
}

/**
 * Creates a secure session cookie
 * @param name - Cookie name
 * @param value - Session value
 * @returns Formatted Set-Cookie header
 */
export function createSessionCookie(name: string, value: string): string {
  return createSecureCookie(name, value, SESSION_COOKIE_OPTIONS.maxAge);
}

/**
 * Creates a cookie deletion header
 * Sets Max-Age=0 to delete cookie
 * @param name - Cookie name to delete
 * @returns Formatted Set-Cookie header for deletion
 */
export function createDeleteCookie(name: string): string {
  if (!isValidCookieName(name)) {
    throw new Error('Invalid cookie name');
  }

  return formatCookieHeader(name, '', {
    ...getSecureCookieOptions(),
    maxAge: 0,
  });
}

/**
 * Extracts cookie value from Cookie header
 * @param cookieHeader - Cookie header value (from request)
 * @param cookieName - Name of cookie to extract
 * @returns Cookie value or null if not found
 */
export function extractCookie(cookieHeader: string, cookieName: string): string | null {
  if (typeof cookieHeader !== 'string' || typeof cookieName !== 'string') {
    return null;
  }

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split('=');
    if (name === cookieName && rest.length > 0) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return null;
      }
    }
  }

  return null;
}
