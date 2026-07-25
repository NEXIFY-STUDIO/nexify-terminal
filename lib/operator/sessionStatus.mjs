/**
 * @typedef {Object} StatusSession
 * @property {string | null | undefined} [lastCommand]
 * @property {boolean | null | undefined} [failedLast]
 * @property {string | null | undefined} [recentOutput]
 *
 * @typedef {Object} StatusHealthPart
 * @property {string} [status]
 * @property {string} [provider]
 * @property {number} [code]
 * @property {string} [message]
 * @property {number} [port]
 *
 * @typedef {Object} StatusReportOptions
 * @property {StatusSession} [session]
 * @property {{ ui?: StatusHealthPart | null, hackApi?: StatusHealthPart | null, ai?: StatusHealthPart | null, overall?: string }} [health]
 * @property {string | null | undefined} [shellSessionId]
 * @property {string} [viewMode]
 * @property {number} [messageCount]
 */

export function isStatusCommand(input) {
  return String(input || '').trim().toLowerCase() === 'status';
}

export async function fetchNexifyServiceHealth(fetchImpl = fetch) {
  try {
    const res = await fetchImpl('/api/health', { cache: 'no-store' });
    if (!res.ok) {
      return {
        overall: 'down',
        ui: { status: 'error', code: res.status },
        hackApi: { status: 'error', code: res.status },
        ai: { status: 'error', code: res.status },
      };
    }

    const data = await res.json();
    return {
      overall: data.overall || data.status || 'unknown',
      ui: data.ui || { status: data.status === 'ok' ? 'ok' : 'error', port: data.port },
      hackApi: data.hackApi || null,
      ai: data.ai || null,
    };
  } catch (error) {
    return {
      overall: 'down',
      ui: { status: 'error', message: error.message },
      hackApi: { status: 'error', message: error.message },
      ai: { status: 'error', message: error.message },
    };
  }
}

export function isNexifyStackHealthy(health = {}) {
  return (
    health.ui?.status === 'ok' &&
    health.hackApi?.status === 'ok' &&
    health.ai?.status === 'ok'
  );
}

/**
 * @param {StatusReportOptions} [options]
 * @returns {string}
 */
export function formatNexifyStatusReport({
  session = {},
  health = {},
  shellSessionId = null,
  viewMode = 'chat',
  messageCount = 0,
} = {}) {
  const uiOk = health.ui?.status === 'ok';
  const hackOk = health.hackApi?.status === 'ok';
  const aiOk = health.ai?.status === 'ok';
  const aiProvider = health.ai?.provider ? ` (${health.ai.provider})` : '';

  const lines = [
    'NEXIFY STATUS',
    `overall: ${health.overall || (isNexifyStackHealthy(health) ? 'ok' : 'degraded')}`,
    `view: ${viewMode}`,
    `messages: ${messageCount}`,
    `shell: ${shellSessionId ? 'connected' : 'offline'}`,
    `last_command: ${session.lastCommand || '—'}`,
    `failed_last: ${session.failedLast ? 'true' : 'false'}`,
    `ui :3322 → ${uiOk ? 'ok' : 'down'}`,
    `hack-api :3021 → ${hackOk ? 'ok' : 'down'}`,
    `ai :8788 → ${aiOk ? `ok${aiProvider}` : 'down'}`,
    'stack: Nexify :3322 · hack-api :3021 · ai-proxy :8788',
    'access: Tailscale → domáci uzol (Mac)',
  ];

  if (session.recentOutput) {
    const preview =
      session.recentOutput.length > 120
        ? session.recentOutput.slice(-120)
        : session.recentOutput;
    lines.push(`recent_output: ${preview}`);
  }

  lines.push('tip: restart = reštart Mac stacku | clear = UI reload');
  return lines.join('\n');
}
