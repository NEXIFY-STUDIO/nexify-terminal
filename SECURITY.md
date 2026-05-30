# Security Implementation Guide

This document outlines the security features implemented in this production-ready Next.js application.

## Overview

This application includes comprehensive security measures to protect against common web vulnerabilities and ensure safe operation on both HTTP and HTTPS protocols. All security features are production-ready and follow industry best practices.

## Security Features Implemented

### 1. Security Headers

All requests include security headers to prevent common attacks:

- **Strict-Transport-Security (HSTS)**: Enforces HTTPS for all connections (31536000 seconds / 1 year)
- **X-Content-Type-Options**: Prevents MIME type sniffing (nosniff)
- **X-Frame-Options**: Prevents clickjacking attacks (DENY)
- **X-XSS-Protection**: Legacy XSS protection header (1; mode=block)
- **Referrer-Policy**: Controls referrer information (strict-origin-when-cross-origin)
- **Content-Security-Policy**: Restricts resource loading and prevents inline script execution
- **Permissions-Policy**: Disables unnecessary browser features

Configuration: `next.config.mjs` and `middleware.ts`

### 2. Input Validation & Sanitization

Comprehensive input validation prevents XSS, SQL injection, and other attacks:

```typescript
import { validateSecureInput, escapeHtml, sanitizeInput } from '@/lib/security';

// Validate and sanitize user input
const input = validateSecureInput(userInput, {
  minLength: 1,
  maxLength: 500,
  checkSqlInjection: true,
});

// Escape for HTML context
const safe = escapeHtml(userInput);

// Remove dangerous content
const clean = sanitizeInput(userInput);
```

**Features:**
- XSS prevention through HTML sanitization
- SQL injection pattern detection
- Length validation
- Special character filtering
- Safe JSON parsing

File: `src/lib/security/inputValidation.ts`

### 3. CSRF Protection

Provides CSRF token generation and validation:

```typescript
import { generateCsrfToken, csrfTokenStore } from '@/lib/security';

// Generate token for user session
const token = generateCsrfToken();
csrfTokenStore.store(sessionId, token);

// Validate token in request
const valid = csrfTokenStore.validate(sessionId, requestToken);
```

**Features:**
- Cryptographically secure token generation
- Timing-attack safe comparison
- Token expiration (1 hour)
- Automatic cleanup of expired tokens

File: `src/lib/security/csrfToken.ts`

### 4. Cookie Security

Enforces secure cookie configuration:

```typescript
import { createSessionCookie, SESSION_COOKIE_OPTIONS } from '@/lib/security';

// Create secure session cookie
const cookie = createSessionCookie('session', sessionValue);

// Cookies are configured with:
// - HttpOnly: Prevents JavaScript access (XSS protection)
// - Secure: Only sent over HTTPS
// - SameSite=Lax: CSRF protection with safe cross-site requests
```

**Options:**
- `SESSION_COOKIE_OPTIONS`: 24-hour session cookies
- `REMEMBER_ME_COOKIE_OPTIONS`: 30-day persistent cookies
- `CSRF_TOKEN_COOKIE_OPTIONS`: 1-hour CSRF tokens

File: `src/lib/security/cookieSecurity.ts`

### 5. Rate Limiting

Prevents abuse and DDoS attacks with per-IP rate limiting:

```typescript
import { apiRateLimiter, getClientIp } from '@/lib/security';

// Check rate limit
const clientIp = getClientIp(request);
const limit = apiRateLimiter.check(clientIp);

if (!limit.allowed) {
  // Too many requests
  return new Response('Rate limited', { status: 429 });
}
```

**Limits:**
- API endpoints: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes
- Public endpoints: 1000 requests per 15 minutes
- Private IPs: Excluded from rate limiting

File: `src/lib/security/rateLimiter.ts`

### 6. Error Handling

Secure error handling without leaking sensitive information:

```typescript
import { sanitizeError, logSecurityError } from '@/lib/security';

try {
  // ... code ...
} catch (error) {
  // Safe error response (no stack traces in production)
  const response = sanitizeError(error);

  // Log with sensitive data redacted
  logSecurityError(error, { endpoint: '/api/data', userId: '123' });
}
```

**Features:**
- No stack trace leakage in production
- Generic error messages for unknown errors
- Safe HTTP status messages
- Automatic sensitive field redaction (passwords, tokens)
- Request validation

File: `src/lib/security/errorHandling.ts`

### 7. Environment Validation

Ensures security-critical environment variables are configured:

```typescript
import { validateSecurityConfig, getEnvConfig } from '@/lib/security';

// Validate on startup
validateSecurityConfig();

// Get config
const config = getEnvConfig();
console.log(config.isProduction); // true if NODE_ENV=production
console.log(config.enableHttps); // true if HTTPS enabled
```

**Checks:**
- NODE_ENV is set correctly
- NEXTAUTH_SECRET is at least 32 characters
- NEXTAUTH_URL is HTTPS in production
- Required variables are not empty

File: `src/lib/security/envValidation.ts`

### 8. HTTPS Enforcement

Automatic HTTPS redirection in production:

- All HTTP requests redirected to HTTPS
- HSTS header forces browser to use HTTPS
- Secure cookies only sent over HTTPS

Configuration: `middleware.ts`

### 9. Security Middleware

Centralized middleware applies security policies to all requests:

- Applies security headers to every response
- Enforces HTTPS in production
- Implements rate limiting
- Prevents request smuggling
- Validates request size

File: `middleware.ts`

## Environment Setup

### Required Environment Variables

Create a `.env.local` file (based on `.env.example`):

```bash
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-random-32-char-secret-here
```

**Generating NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

### Development vs Production

Development mode (`NODE_ENV=development`):
- Lenient security headers
- Rate limiting disabled
- Stack traces shown in errors
- Unsafe inline scripts allowed for debugging

Production mode (`NODE_ENV=production`):
- Strict security headers
- Rate limiting enabled
- Generic error messages
- HTTPS enforced
- Strict CSP policy

## API Usage Examples

### Validating User Input

```typescript
import { validateSecureInput } from '@/lib/security';

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const username = validateSecureInput(body.username, {
      minLength: 3,
      maxLength: 50,
      checkSqlInjection: true,
    });
    // ... proceed with validated input ...
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
```

### Setting Secure Cookies

```typescript
import { createSessionCookie, SESSION_COOKIE_OPTIONS } from '@/lib/security';

export async function POST(request: Request) {
  // ... authenticate user ...

  const cookie = createSessionCookie('session', sessionToken);

  return new Response('OK', {
    status: 200,
    headers: {
      'Set-Cookie': cookie,
    },
  });
}
```

### Rate Limiting API Endpoints

```typescript
import { apiRateLimiter, getClientIp } from '@/lib/security';

export async function GET(request: Request) {
  const clientIp = getClientIp(request);
  const limit = apiRateLimiter.check(clientIp);

  if (!limit.allowed) {
    return Response.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(limit.retryAfter || 60),
        },
      }
    );
  }

  // ... handle request ...
}
```

### Safe Error Responses

```typescript
import { sanitizeError, logSecurityError } from '@/lib/security';

export async function POST(request: Request) {
  try {
    // ... process request ...
  } catch (error) {
    logSecurityError(error, { endpoint: '/api/data' });
    const response = sanitizeError(error);
    return Response.json(response, { status: 500 });
  }
}
```

## Security Checklist

Before deploying to production, verify:

- [ ] `NODE_ENV=production` is set
- [ ] `NEXTAUTH_URL` is HTTPS
- [ ] `NEXTAUTH_SECRET` is 32+ characters and randomized
- [ ] `.env.local` is in `.gitignore`
- [ ] All user inputs are validated
- [ ] CORS is properly configured if needed
- [ ] Database credentials are in environment variables
- [ ] Rate limiting is enabled
- [ ] Security headers are being applied
- [ ] HTTPS certificate is valid
- [ ] Middleware is active and tested
- [ ] Error logging doesn't leak sensitive data

## Monitoring & Logging

### Secure Logging

Sensitive fields are automatically redacted from logs:
- Passwords
- Tokens
- API keys
- Authorization headers
- Credit card numbers

### Log Locations

In production, check:
- Application logs for rate limit violations
- Security event logs for failed validations
- Error logs for sensitive data (should be redacted)

## Testing Security

### Manual Testing

```bash
# Test HTTPS enforcement
curl -i http://localhost:3000/api/data

# Test rate limiting (should return 429 after limit)
for i in {1..101}; do curl -i http://localhost:3000/api/data; done

# Test security headers
curl -i https://localhost:3000/ | grep -E "Strict-Transport|X-Frame-Options|X-Content"
```

### Automated Testing

Run security validation:

```bash
npm run build  # Will validate env config
```

## Updating Security Settings

### Changing Rate Limits

Edit `src/lib/security/rateLimiter.ts`:

```typescript
// Change default limit to 200 requests per 15 minutes
export const apiRateLimiter = new RateLimiter(15 * 60 * 1000, 200);
```

### Customizing CSP

Edit `next.config.mjs` headers section to adjust Content-Security-Policy.

### Adding Custom Security Headers

Edit `next.config.mjs` to add additional headers for your application.

## Known Limitations

1. **Rate Limiting**: Uses in-memory storage. For distributed deployments (multiple servers), use a shared store like Redis.
2. **CSRF Tokens**: Also uses in-memory storage. Use server sessions or database for production multi-instance deployments.
3. **Cookie Domain**: Customize in `src/lib/security/cookieSecurity.ts` if using subdomains.

## Support & Questions

For security issues, follow responsible disclosure practices and contact the development team before public disclosure.

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Security Headers](https://securityheaders.com/)
- [MDN Web Docs - Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Next.js Security Best Practices](https://nextjs.org/docs/guides/security)
