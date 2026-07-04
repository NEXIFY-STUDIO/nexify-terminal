/**
 * Security Middleware for Next.js
 * Applies security headers, enforces HTTPS, and implements rate limiting
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSecurityHeaders, mergeHeaders, ANTI_LEAK_HEADERS } from '@/lib/security/securityHeaders';
import { apiRateLimiter, getClientIp, isPrivateIp } from '@/lib/security/rateLimiter';
import { isDevelopment } from '@/lib/security/envValidation';

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_CONFIG = {
  enabled: !isDevelopment(), // Only in production
  excludePrivateIps: true, // Don't rate limit localhost
};

/**
 * Paths to exclude from rate limiting
 */
const RATE_LIMIT_EXCLUDE_PATHS = [
  '/_next/',
  '/api/health',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

/**
 * Paths requiring stricter rate limiting
 */
const AUTH_PATHS = ['/api/auth/', '/login', '/register'];

/**
 * Checks if path should be rate limited
 */
function shouldRateLimit(pathname: string): boolean {
  return !RATE_LIMIT_EXCLUDE_PATHS.some((excluded) => pathname.startsWith(excluded));
}

/**
 * Gets appropriate rate limit for request
 */
function getRateLimitForPath(pathname: string): { max: number; window: number } {
  if (AUTH_PATHS.some((auth) => pathname.startsWith(auth))) {
    return { max: 5, window: 15 * 60 * 1000 }; // 5 requests per 15 minutes
  }
  return { max: 100, window: 15 * 60 * 1000 }; // 100 requests per 15 minutes
}

/**
 * Main middleware function
 * Applies security headers and enforces security policies
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let normalizedIp = '127.0.0.1';

  // 0. Enforce Tailscale Device Lockdown
  const isStaticAsset = pathname.startsWith('/_next/') || pathname.startsWith('/icons/') || pathname.includes('.');
  if (!isStaticAsset) {
    const rawClientIp = (request as any).ip || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || '127.0.0.1';
    
    // Normalize localhost IPv6 and IPv6-mapped IPv4 addresses (e.g. ::ffff:100.103.153.97)
    normalizedIp = rawClientIp;
    if (normalizedIp.startsWith('::ffff:')) {
      normalizedIp = normalizedIp.substring(7);
    }
    if (normalizedIp === '::1') {
      normalizedIp = '127.0.0.1';
    }
    
    const allowedIps = ['127.0.0.1'];
    const tailscaleAllowedIp = process.env.TAILSCALE_ALLOWED_IP || '100.103.153.97,fd7a:115c:a1e0::2636:9961';
    
    tailscaleAllowedIp.split(',').forEach(ip => {
      if (ip.trim()) allowedIps.push(ip.trim());
    });

    // Auto-allow any Tailscale IPv4/IPv6 or local private network IP (LAN/Wi-Fi)
    if (isPrivateIp(normalizedIp) || normalizedIp.startsWith('100.') || normalizedIp.startsWith('fd7a:115c:a1e0:')) {
      allowedIps.push(normalizedIp);
    }

    const disableLockdown = process.env.DISABLE_TAILSCALE_LOCKDOWN === 'true';
    if (!allowedIps.includes(normalizedIp) && !disableLockdown) {
      console.warn(`[SECURITY LOCKDOWN] Blocked request to ${pathname} from unauthorized IP: ${normalizedIp} (raw: ${rawClientIp})`);
      return new NextResponse(
        'Access Denied: Connection restricted to authorized Tailscale devices only.',
        {
          status: 403,
          headers: { 'Content-Type': 'text/plain' }
        }
      );
    }
  }

  const response = NextResponse.next();
  const protocol = request.nextUrl.protocol;

  // 1. Enforce HTTPS in production (except for localhost, LAN, and Tailscale private connections)
  if (!isDevelopment() && protocol !== 'https:' && !isPrivateIp(normalizedIp)) {
    const httpsUrl = new URL(request.nextUrl);
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl, { status: 301 });
  }

  // 2. Apply security headers
  const securityHeaders = getSecurityHeaders(isDevelopment());
  const antiLeakHeaders = ANTI_LEAK_HEADERS;
  const allHeaders = mergeHeaders(
    securityHeaders as unknown as Record<string, string>,
    antiLeakHeaders
  );

  for (const [key, value] of Object.entries(allHeaders)) {
    response.headers.set(key, value);
  }

  // 2.5. Remove HSTS for local/private connections to prevent browser-side HTTPS loops
  if (isPrivateIp(normalizedIp)) {
    response.headers.delete('Strict-Transport-Security');
  }

  // 3. Add additional security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // 4. Rate limiting (only for API routes in production)
  if (RATE_LIMIT_CONFIG.enabled && shouldRateLimit(pathname) && pathname.startsWith('/api/')) {
    const clientIp = getClientIp({
      headers: Object.fromEntries(request.headers.entries()),
    });

    console.log(`[MIDDLEWARE] API Request: ${pathname}, Client IP: ${clientIp}, Private: ${isPrivateIp(clientIp)}, RATE_LIMIT_CONFIG.enabled: ${RATE_LIMIT_CONFIG.enabled}`);

    // Skip rate limiting for private IPs (localhost, internal networks)
    if (!RATE_LIMIT_CONFIG.excludePrivateIps || !isPrivateIp(clientIp)) {
      const limit = apiRateLimiter.check(clientIp);

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', '100');
      response.headers.set('X-RateLimit-Remaining', String(limit.remaining));
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(limit.resetTime / 1000)));

      // Block if exceeded
      if (!limit.allowed) {
        const retryAfter = limit.retryAfter || 60;
        response.headers.set('Retry-After', String(retryAfter));

        return NextResponse.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests. Please try again later.',
            },
          },
          {
            status: 429,
            headers: response.headers,
          }
        );
      }
    }
  }

  return response;
}

/**
 * Configure which routes use middleware
 */
export const config = {
  matcher: [
    // Apply to all routes except:
    '/((?!_next|static|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
