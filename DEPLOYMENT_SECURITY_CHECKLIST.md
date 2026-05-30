# Deployment & Security Checklist

This checklist ensures your application is properly configured for secure production deployment.

## Pre-Deployment Verification

### Environment Configuration

- [ ] `NODE_ENV` is set to `production`
- [ ] `NEXTAUTH_URL` is set to your HTTPS domain (e.g., `https://yourdomain.com`)
- [ ] `NEXTAUTH_SECRET` is generated using: `openssl rand -base64 32`
- [ ] `NEXTAUTH_SECRET` is at least 32 characters long
- [ ] All environment variables are in `.env.local` (NOT in `.env` or `.env.example`)
- [ ] `.env.local` is added to `.gitignore`
- [ ] Database credentials are in environment variables, not hardcoded
- [ ] No sensitive data in git history

### HTTPS & Security Headers

- [ ] SSL/TLS certificate is valid and not self-signed
- [ ] HTTPS is enforced (HTTP redirects to HTTPS)
- [ ] Middleware is active and applying security headers
- [ ] HSTS header is enabled with appropriate max-age
- [ ] CSP policy is configured for your domain
- [ ] Security headers verified with: `curl -i https://yourdomain.com`

### Application Security

- [ ] All user inputs are validated using security utilities
- [ ] Sensitive errors are not exposed to clients
- [ ] Error logs don't contain passwords, tokens, or API keys
- [ ] CSRF tokens are generated for state-changing operations
- [ ] Secure cookies are configured (HttpOnly, Secure, SameSite)
- [ ] Rate limiting is enabled for API endpoints
- [ ] No console.log statements with sensitive data in production code

### Database & API

- [ ] Database connection string uses strong authentication
- [ ] Database queries use parameterized statements (no string concatenation)
- [ ] Database user has minimal required permissions
- [ ] Backup strategy is in place
- [ ] Third-party API keys are rotated regularly
- [ ] API endpoints validate request size (< 1MB)
- [ ] API endpoints validate Content-Type headers

### Monitoring & Logging

- [ ] Error logging is configured (Sentry, LogRocket, etc.)
- [ ] Application logs are monitored for security events
- [ ] Rate limit violations are logged and monitored
- [ ] Failed authentication attempts are logged
- [ ] Sensitive fields are redacted from all logs

### Deployment Platform

- [ ] Build succeeds without errors: `pnpm build`
- [ ] Environment variables are set in deployment platform
- [ ] Build runs security validation on startup
- [ ] Custom domain is configured (not using auto-generated URL)
- [ ] CDN caching is configured appropriately

## Security Utilities Usage Guide

### Input Validation

Use when accepting user input:

```typescript
import { validateSecureInput } from '@/lib/security';

const username = validateSecureInput(req.body.username, {
  minLength: 3,
  maxLength: 50,
  checkSqlInjection: true,
});
```

### Secure Cookies

Use when setting session cookies:

```typescript
import { createSessionCookie } from '@/lib/security';

const setCookie = createSessionCookie('session', sessionToken);
response.headers.set('Set-Cookie', setCookie);
```

### Rate Limiting

Use for API endpoints:

```typescript
import { apiRateLimiter, getClientIp } from '@/lib/security';

const ip = getClientIp(req);
const limit = apiRateLimiter.check(ip);
if (!limit.allowed) {
  return new Response('Rate limited', { status: 429 });
}
```

### Error Handling

Use for safe error responses:

```typescript
import { sanitizeError, logSecurityError } from '@/lib/security';

try {
  // code
} catch (error) {
  logSecurityError(error, { endpoint: '/api/data' });
  return Response.json(sanitizeError(error), { status: 500 });
}
```

## Post-Deployment Verification

### Test Security Headers

```bash
# Check security headers
curl -i https://yourdomain.com | grep -E "Strict-Transport|X-Frame|X-Content|CSP"

# Should see:
# Strict-Transport-Security: max-age=31536000
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: ...
```

### Test HTTPS Enforcement

```bash
# Should redirect to HTTPS
curl -i http://yourdomain.com

# Should return 301/302 with Location: https://yourdomain.com
```

### Test Rate Limiting

```bash
# Should be rate limited after ~100 requests
for i in {1..105}; do curl -s https://yourdomain.com/api/data; done

# Last requests should return 429 Too Many Requests
```

### Test Input Validation

```bash
# Should reject suspicious input
curl -X POST https://yourdomain.com/api/endpoint \
  -d '{"input": "<script>alert(1)</script>"}'

# Should return 400 or sanitized content
```

### SSL Certificate Check

```bash
# Check certificate details
openssl s_client -connect yourdomain.com:443

# Verify it's valid and not self-signed
# Check expiration date
```

## Monitoring & Maintenance

### Weekly Tasks

- [ ] Review error logs for suspicious patterns
- [ ] Check rate limiting logs for abuse attempts
- [ ] Verify HTTPS certificate expiration (if not auto-renewed)

### Monthly Tasks

- [ ] Review and rotate API keys/tokens
- [ ] Check for security updates to dependencies
- [ ] Review access logs for unusual patterns
- [ ] Test automated backups

### Quarterly Tasks

- [ ] Run security audit: `pnpm audit`
- [ ] Update all dependencies: `pnpm update`
- [ ] Review and update security policies
- [ ] Perform penetration testing (or hire for it)

### Annually

- [ ] Full security audit
- [ ] Compliance review (GDPR, CCPA, etc.)
- [ ] Update security documentation
- [ ] Employee security training

## Incident Response

If a security issue is discovered:

1. **Assess Impact**: Determine what data/systems were affected
2. **Contain**: Take affected systems offline if necessary
3. **Notify**: Follow your incident notification policy
4. **Investigate**: Review logs to determine root cause
5. **Fix**: Deploy security patch
6. **Verify**: Confirm fix resolves issue
7. **Document**: Document incident and lessons learned

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Security Headers.com](https://securityheaders.com/)
- [Mozilla Web Security](https://infosec.mozilla.org/guidelines/web_security)
- [Next.js Security Best Practices](https://nextjs.org/docs/guides/security)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

## Support

For security questions or issues:
1. Check SECURITY.md in project root
2. Review security utility documentation
3. Check middleware.ts for applied security policies
4. Contact security team or maintainers

Last Updated: 2026-05-30
Security Implementation Version: 1.0
