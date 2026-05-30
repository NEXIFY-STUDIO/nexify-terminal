/**
 * Rate Limiting Utility
 * Implements sliding window rate limiting with per-IP tracking
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limiter using sliding window algorithm
 * Tracks requests per IP and enforces rate limits
 */
class RateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  /**
   * Creates a new rate limiter
   * @param windowMs - Time window in milliseconds (default 15 minutes)
   * @param maxRequests - Maximum requests per window (default 100)
   */
  constructor(windowMs = 15 * 60 * 1000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Checks if request from IP is allowed
   * @param ip - Client IP address
   * @returns Object with allowed status, remaining count, and reset time
   */
  check(ip: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    if (!ip || typeof ip !== 'string') {
      return { allowed: false, remaining: 0, resetTime: 0 };
    }

    const now = Date.now();
    let record = this.store.get(ip);

    // Create new record or reset if window expired
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      this.store.set(ip, record);
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: record.resetTime,
      };
    }

    // Increment counter
    record.count++;

    const allowed = record.count <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - record.count);
    const retryAfter = allowed ? undefined : Math.ceil((record.resetTime - now) / 1000);

    return {
      allowed,
      remaining,
      resetTime: record.resetTime,
      retryAfter,
    };
  }

  /**
   * Resets rate limit for an IP
   * @param ip - IP address to reset
   */
  reset(ip: string): void {
    if (ip) {
      this.store.delete(ip);
    }
  }

  /**
   * Cleans up expired records to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    for (const [ip, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(ip);
      }
    }
  }

  /**
   * Gets current rate limit status for an IP
   * @param ip - IP address
   * @returns Current status
   */
  getStatus(ip: string): RateLimitRecord | null {
    return this.store.get(ip) || null;
  }
}

/**
 * Creates a rate limiter for API endpoints
 * Default: 100 requests per 15 minutes
 */
export const apiRateLimiter = new RateLimiter(15 * 60 * 1000, 100);

/**
 * Creates a stricter rate limiter for auth endpoints
 * Default: 5 requests per 15 minutes
 */
export const authRateLimiter = new RateLimiter(15 * 60 * 1000, 5);

/**
 * Creates a lenient rate limiter for public endpoints
 * Default: 1000 requests per 15 minutes
 */
export const publicRateLimiter = new RateLimiter(15 * 60 * 1000, 1000);

/**
 * Extracts client IP from request
 * Handles X-Forwarded-For header and direct IP
 * @param req - Request object
 * @returns Client IP address
 */
export function getClientIp(req: {
  headers?: Record<string, string | string[]>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string {
  if (!req) {
    return '127.0.0.1';
  }

  // Check X-Forwarded-For header (from proxies)
  if (req.headers) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      // X-Forwarded-For can be comma-separated list, use first IP
      return forwarded.split(',')[0].trim();
    }
  }

  // Check direct properties
  if (req.ip) {
    return req.ip;
  }

  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }

  return '127.0.0.1';
}

/**
 * Validates IP address format
 * Supports IPv4 and IPv6
 * @param ip - IP address to validate
 * @returns true if IP format is valid
 */
export function isValidIpAddress(ip: string): boolean {
  if (typeof ip !== 'string') {
    return false;
  }

  // IPv4 pattern
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 pattern (simplified)
  const ipv6 = /^[0-9a-f:]+$/i;

  return ipv4.test(ip) || (ipv6.test(ip) && ip.includes(':'));
}

/**
 * Checks if IP is in private range (not rate limited)
 * @param ip - IP address to check
 * @returns true if IP is private/localhost
 */
export function isPrivateIp(ip: string): boolean {
  if (typeof ip !== 'string') {
    return false;
  }

  const privateRanges = [
    /^127\./, // localhost
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // Tailscale CGNAT private IPs
    /^::1$/, // IPv6 localhost
    /^fc|^fd/, // IPv6 private
  ];

  return privateRanges.some((range) => range.test(ip));
}

// Cleanup stale records periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    apiRateLimiter.cleanup();
    authRateLimiter.cleanup();
    publicRateLimiter.cleanup();
  }, 5 * 60 * 1000);
}
