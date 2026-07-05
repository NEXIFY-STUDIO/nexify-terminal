/**
 * Environment Variable Validation
 * Ensures required security environment variables are configured
 */

export interface EnvConfig {
  nodeEnv: 'development' | 'production' | 'test';
  isProduction: boolean;
  isDevelopment: boolean;
  nextPublicUrl: string;
  nextAuthUrl: string;
  nextAuthSecret: string;
  secureCookies: boolean;
  enableHttps: boolean;
}

/**
 * Validates and loads environment configuration
 * Throws error if required variables missing in production
 * @returns Validated environment configuration
 */
export function validateEnv(): EnvConfig {
  const isProd = process.env.NODE_ENV === 'production';
  const isDev = !isProd;
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';

  // In production, these environment variables are critical
  if (isProd) {
    validateRequiredVar('NEXTAUTH_URL', process.env.NEXTAUTH_URL);
    validateRequiredVar('NEXTAUTH_SECRET', process.env.NEXTAUTH_SECRET);
  }

  // NEXTAUTH_SECRET must be strong (at least 32 chars)
  if (process.env.NEXTAUTH_SECRET) {
    if (process.env.NEXTAUTH_SECRET.length < 32) {
      throw new Error('NEXTAUTH_SECRET must be at least 32 characters long');
    }
  }

  const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3322';
  const nextAuthSecret = process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production';

  // Determine secure cookies setting
  const secureCookies = nextAuthUrl.startsWith('https');

  // Determine HTTPS enforcement
  const enableHttps = !isDev && secureCookies;

  // Validate URL format
  try {
    new URL(nextAuthUrl);
  } catch {
    throw new Error(`Invalid NEXTAUTH_URL format: ${nextAuthUrl}`);
  }

  return {
    nodeEnv,
    isProduction: isProd,
    isDevelopment: isDev,
    nextPublicUrl: nextAuthUrl,
    nextAuthUrl,
    nextAuthSecret,
    secureCookies,
    enableHttps,
  };
}

/**
 * Validates a required environment variable exists and is not empty
 * @param varName - Variable name
 * @param value - Variable value
 * @throws Error if variable is missing or empty
 */
function validateRequiredVar(varName: string, value: unknown): void {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new Error(`Required environment variable missing: ${varName}`);
  }
}

/**
 * Gets validated environment config (cached)
 */
let cachedEnvConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!cachedEnvConfig) {
    cachedEnvConfig = validateEnv();
  }
  return cachedEnvConfig;
}

/**
 * Checks if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Gets the application URL
 */
export function getAppUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3322';
}

/**
 * Checks if secure cookies should be enabled
 */
export function shouldEnableSecureCookies(): boolean {
  const url = getAppUrl();
  return url.startsWith('https') || !url.includes('localhost');
}

/**
 * Environment variables that should never be logged
 */
const SENSITIVE_ENV_VARS = [
  'NEXTAUTH_SECRET',
  'API_KEY',
  'DATABASE_URL',
  'STRIPE_SECRET_KEY',
  'PASSWORD',
  'TOKEN',
];

/**
 * Checks if an environment variable name is sensitive
 */
export function isSensitiveEnvVar(varName: string): boolean {
  return SENSITIVE_ENV_VARS.some((sensitive) => varName.toUpperCase().includes(sensitive));
}

/**
 * Gets safe representation of environment variables for logging
 * Redacts sensitive values
 */
export function getSafeEnvVars(): Record<string, string> {
  const safe: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value !== 'string') {
      continue;
    }

    if (isSensitiveEnvVar(key)) {
      safe[key] = '[REDACTED]';
    } else {
      safe[key] = value;
    }
  }

  return safe;
}

/**
 * Validates security configuration on startup
 * Warns about insecure settings in development
 */
export function validateSecurityConfig(): void {
  const isDev = isDevelopment();
  const isProd = isProduction();
  const url = getAppUrl();

  // Development warnings
  if (isDev) {
    if (process.env.NEXTAUTH_SECRET === 'dev-secret-change-in-production') {
      console.warn(
        '[SECURITY] Using default NEXTAUTH_SECRET in development. Set NEXTAUTH_SECRET for production.'
      );
    }
  }

  // Production checks (log warnings but don't exit - deployment may set env vars later)
  if (isProd) {
    if (!url.startsWith('https')) {
      console.warn('[SECURITY] NEXTAUTH_URL should use HTTPS in production for security');
    }

    if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
      console.warn('[SECURITY] NEXTAUTH_SECRET should be set to a 32+ character value in production');
    }
  }
}

/**
 * Security checklist for deployment
 */
export function getSecurityChecklistStatus(): Record<string, boolean> {
  const isProd = isProduction();
  const url = getAppUrl();

  return {
    nodeEnvSet: !!process.env.NODE_ENV,
    isProduction: isProd,
    hasHttpsUrl: url.startsWith('https') || !url.includes('localhost'),
    hasAuthSecret: !!process.env.NEXTAUTH_SECRET,
    authSecretLongEnough: (process.env.NEXTAUTH_SECRET?.length || 0) >= 32,
    hasAuthUrl: !!process.env.NEXTAUTH_URL,
  };
}

/**
 * Gets security status report
 */
export function getSecurityStatusReport(): string {
  const checklist = getSecurityChecklistStatus();
  let report = '\n=== SECURITY STATUS ===\n';

  for (const [check, passed] of Object.entries(checklist)) {
    const status = passed ? '✓' : '✗';
    report += `${status} ${check}\n`;
  }

  return report;
}
