/**
 * Service configuration for Nexify Terminal backend proxies.
 *
 * Centralizes the env-configured URLs and server-side tokens used by the
 * Next route handlers in app/api/{tools,shell,ai}. Tokens are read here on the
 * server only and are never sent to the client.
 */

const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

/** Hacking API (tools + remote shell). Defaults to local dev port 3010. */
export function getHackApiUrl(): string {
  return stripTrailingSlash(process.env.HACK_API_URL || 'http://127.0.0.1:3010');
}

/** AI proxy service. Defaults to local dev port 8787. */
export function getAiProxyUrl(): string {
  return stripTrailingSlash(process.env.AI_PROXY_URL || 'http://127.0.0.1:8787');
}

/** Server-side token for the hacking API tool endpoints (X-Hack-Token). */
export function getHackApiToken(): string {
  return process.env.HACK_API_TOKEN || '';
}

/** Server-side token for the remote shell endpoints (X-Shell-Token). */
export function getShellToken(): string {
  return process.env.SHELL_TOKEN || '';
}

/** Default fetch timeout for proxied upstream calls (ms). */
export const PROXY_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 30_000);
