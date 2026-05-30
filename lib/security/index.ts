/**
 * Security Module - Central export for all security utilities
 * Provides comprehensive security features for production deployment
 */

// Input validation and sanitization
export {
  escapeHtml,
  sanitizeInput,
  isValidEmail,
  isValidUrl,
  detectSqlInjectionPattern,
  isValidLength,
  isAlphanumeric,
  parseSafeJson,
  encodeUrlParam,
  isAllowedMimeType,
  isValidFileSize,
  stripHtmlTags,
  validateSecureInput,
  normalizeInput,
} from './inputValidation';

// CSRF token management
export { generateCsrfToken, isValidCsrfTokenFormat, extractCsrfToken, csrfTokenStore } from './csrfToken';

// Rate limiting
export {
  apiRateLimiter,
  authRateLimiter,
  publicRateLimiter,
  getClientIp,
  isValidIpAddress,
  isPrivateIp,
} from './rateLimiter';

// Cookie security
export {
  DEFAULT_SECURE_COOKIE_OPTIONS,
  SESSION_COOKIE_OPTIONS,
  REMEMBER_ME_COOKIE_OPTIONS,
  CSRF_TOKEN_COOKIE_OPTIONS,
  formatCookieHeader,
  parseCookieHeader,
  isValidCookieName,
  isValidCookieValue,
  supportsSecureCookies,
  getSecureCookieOptions,
  createSecureCookie,
  createSessionCookie,
  createDeleteCookie,
  extractCookie,
} from './cookieSecurity';

// Error handling
export {
  SecurityError,
  sanitizeError,
  isValidRequestBody,
  createErrorResponse,
  HTTP_STATUS_MESSAGES,
  getSafeStatusMessage,
  logSecurityError,
  isAllowedContentType,
  hasRequiredSecurityHeaders,
  getErrorStatusCode,
  redactSensitiveData,
} from './errorHandling';

// Environment validation
export {
  validateEnv,
  getEnvConfig,
  isProduction,
  isDevelopment,
  getAppUrl,
  shouldEnableSecureCookies,
  isSensitiveEnvVar,
  getSafeEnvVars,
  validateSecurityConfig,
  getSecurityChecklistStatus,
  getSecurityStatusReport,
} from './envValidation';

// Security headers
export {
  DEFAULT_SECURITY_HEADERS,
  DEVELOPMENT_SECURITY_HEADERS,
  getSecurityHeaders,
  formatSecurityHeaders,
  CspBuilder,
  NO_CACHE_HEADERS,
  ANTI_LEAK_HEADERS,
  mergeHeaders,
  isValidHeaderName,
  isValidHeaderValue,
  addHeader,
  getHttpsRedirectHeaders,
} from './securityHeaders';
