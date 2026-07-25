/** Standalone operator commands that restart the Mac dev stack via launchd. */
export function isRestartServerCommand(input) {
  const normalized = String(input || '').trim().toLowerCase();
  return (
    normalized === 'restart' ||
    normalized === 'reštart' ||
    normalized === 'restart server' ||
    normalized === 'reštart server' ||
    normalized === 'restart stack' ||
    normalized === 'reštart stack'
  );
}

/**
 * Ask the Mac launchd agent to restart Nexify (Next + hack-api + ai-proxy).
 * @param {typeof fetch} [fetchImpl]
 */
export async function requestNexifyServerRestart(fetchImpl = fetch) {
  const res = await fetchImpl('/api/restart', { method: 'POST' });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = data?.error || data?.message || res.statusText;
    throw new Error(typeof detail === 'string' ? detail : `HTTP ${res.status}`);
  }

  return data;
}

/**
 * @param {{ status?: string, label?: string, domain?: string, error?: string }} [result]
 */
export function formatRestartServerReport(result = {}) {
  if (result.error) {
    return ['NEXIFY RESTART', `error: ${result.error}`, 'tip: skús znova o 30 s'].join('\n');
  }

  return [
    'NEXIFY RESTART',
    'stack: reštartujem cez launchd…',
    `label: ${result.label || 'com.nexify.terminal'}`,
    'čakaj ~15 s, potom sa UI obnoví',
    'tip: status → over health',
  ].join('\n');
}
