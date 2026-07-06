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
 *
 * @typedef {Object} StatusReportOptions
 * @property {StatusSession} [session]
 * @property {{ ui?: StatusHealthPart | null, ai?: StatusHealthPart | null }} [health]
 * @property {string | null | undefined} [shellSessionId]
 * @property {string} [viewMode]
 * @property {number} [messageCount]
 */

export function isStatusCommand(input) {
  return String(input || '').trim().toLowerCase() === 'status';
}

export async function fetchNexifyServiceHealth(fetchImpl = fetch) {
  const health = { ui: null, ai: null };

  try {
    const uiRes = await fetchImpl('/api/health');
    health.ui = uiRes.ok ? await uiRes.json() : { status: 'error', code: uiRes.status };
  } catch (error) {
    health.ui = { status: 'error', message: error.message };
  }

  try {
    const aiRes = await fetchImpl('/api/ai');
    health.ai = aiRes.ok ? await aiRes.json() : { status: 'error', code: aiRes.status };
  } catch (error) {
    health.ai = { status: 'error', message: error.message };
  }

  return health;
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
  const aiOk = health.ai?.status === 'ok';
  const aiProvider = health.ai?.provider ? ` (${health.ai.provider})` : '';

  const lines = [
    'NEXIFY STATUS',
    `view: ${viewMode}`,
    `messages: ${messageCount}`,
    `shell: ${shellSessionId ? 'connected' : 'offline'}`,
    `last_command: ${session.lastCommand || '—'}`,
    `failed_last: ${session.failedLast ? 'true' : 'false'}`,
    `ui :3322 → ${uiOk ? 'ok' : 'down'}`,
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

  lines.push('tip: clear = vymazať pamäť + reštart');
  return lines.join('\n');
}
