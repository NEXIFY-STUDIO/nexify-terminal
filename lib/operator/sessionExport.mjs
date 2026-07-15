import { stripAnsiForSession } from './sessionContext.mjs';

const SENSITIVE_KEY_FRAGMENTS = [
  'API_KEY',
  'SECRET',
  'TOKEN',
  'PASSWORD',
  'PASSCODE',
  'PRIVATE_KEY',
  'MISTRAL',
  'OPENAI',
  'GITHUB',
  'DATABASE_URL',
  'NEXTAUTH',
  'EMERGENT_LLM',
  'SHELL_TOKEN',
  'HACK_API',
];

const DEFAULT_REDACT_PIN = process.env.NEXT_PUBLIC_PASSCODE || '0000';

export function isExportSessionCommand(input) {
  return String(input || '').trim().toLowerCase() === 'export';
}

/**
 * @param {string} text
 * @param {{ pin?: string }} [options]
 */
export function redactExportSecrets(text, options = {}) {
  const pin = options.pin ?? DEFAULT_REDACT_PIN;
  let out = String(text || '');

  for (const frag of SENSITIVE_KEY_FRAGMENTS) {
    const re = new RegExp(`(${frag}[A-Z0-9_]*\\s*=\\s*)(\\S+)`, 'gi');
    out = out.replace(re, '$1[REDACTED]');
  }

  out = out.replace(/^([A-Z][A-Z0-9_]*)\s*=\s*(\S+)/gm, (match, key) => {
    const upper = String(key).toUpperCase();
    if (SENSITIVE_KEY_FRAGMENTS.some((frag) => upper.includes(frag))) {
      return `${key}=[REDACTED]`;
    }
    return match;
  });

  out = out.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
  out = out.replace(/\bsk-[A-Za-z0-9]{8,}\b/g, '[REDACTED]');
  out = out.replace(/PIN:\s*\d+/gi, 'PIN: [REDACTED]');
  out = out.replace(/passcode[:\s]+\d+/gi, 'passcode: [REDACTED]');

  if (pin) {
    out = out.replace(new RegExp(`\\b${String(pin).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), '[REDACTED]');
  }

  out = out.replace(/nexify_authenticated["'\s:=]+["']?[^"'\s,}]+/gi, 'nexify_authenticated: [REDACTED]');

  return out;
}

/**
 * @param {string} content
 */
export function parseOperatorSections(content) {
  const text = String(content || '');
  const lines = text.split('\n');
  const sections = { intent: null, action: [], result: null, hasStructure: false };
  let mode = null;
  const intentLines = [];
  const actionLines = [];
  const resultLines = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^INTENT:\s*/i.test(line)) {
      mode = 'intent';
      sections.hasStructure = true;
      intentLines.push(line.replace(/^INTENT:\s*/i, '').trim());
      continue;
    }

    if (/^ACTION:\s*$/i.test(trimmed)) {
      mode = 'action';
      sections.hasStructure = true;
      continue;
    }

    if (/^ACTION:\s+/i.test(line)) {
      mode = 'action';
      sections.hasStructure = true;
      actionLines.push(line.replace(/^ACTION:\s+/i, '').trim());
      continue;
    }

    if (/^RESULT:\s*/i.test(line)) {
      mode = 'result';
      sections.hasStructure = true;
      resultLines.push(line.replace(/^RESULT:\s*/i, '').trim());
      continue;
    }

    if (mode === 'intent' && trimmed) intentLines.push(line);
    else if (mode === 'action' && trimmed) actionLines.push(line);
    else if (mode === 'result' && trimmed) resultLines.push(line);
  }

  if (intentLines.length) sections.intent = intentLines.join('\n').trim();
  if (actionLines.length) sections.action = actionLines;
  if (resultLines.length) sections.result = resultLines.join('\n').trim();

  return sections;
}

/**
 * @param {Array<{ role?: string; content?: string; type?: string; createdAt?: string | number }>} messages
 * @param {{ exportedAt?: Date; pin?: string }} [options]
 */
export function formatSessionMarkdown(messages = [], options = {}) {
  const exportedAt = options.exportedAt instanceof Date ? options.exportedAt : new Date();
  const pin = options.pin ?? DEFAULT_REDACT_PIN;
  const list = Array.isArray(messages) ? messages : [];

  const lines = [
    '# Nexify Session Export',
    '',
    `**Exported:** ${exportedAt.toISOString()}`,
    `**Messages:** ${list.length}`,
    '',
    '---',
    '',
  ];

  list.forEach((msg, index) => {
    const role = msg?.role ?? 'unknown';
    const type = msg?.type ?? 'chat';
    const raw = redactExportSecrets(stripAnsiForSession(msg?.content ?? ''), { pin });
    if (!raw) return;

    const entryTime =
      msg?.createdAt != null
        ? new Date(msg.createdAt).toISOString()
        : new Date(exportedAt.getTime() - (list.length - index) * 1000).toISOString();

    const label = formatMessageLabel(role, type);
    lines.push(`## ${index + 1}. ${label}`);
    lines.push('');
    lines.push(`**Timestamp:** ${entryTime}`);
    lines.push('');

    if (type === 'command') {
      const cmd = raw.startsWith('$') ? raw : `$ ${raw}`;
      lines.push('```bash');
      lines.push(cmd);
      lines.push('```');
    } else if (type === 'output') {
      lines.push('```');
      lines.push(raw);
      lines.push('```');
    } else if (role === 'assistant' && type === 'chat') {
      const parsed = parseOperatorSections(raw);
      if (parsed.hasStructure) {
        if (parsed.intent) {
          lines.push('### INTENT');
          lines.push(parsed.intent);
          lines.push('');
        }
        if (parsed.action.length) {
          lines.push('### ACTION');
          for (const actionLine of parsed.action) {
            lines.push(actionLine.startsWith('$') ? actionLine : `$ ${actionLine}`);
          }
          lines.push('');
        }
        if (parsed.result) {
          lines.push('### RESULT');
          lines.push(parsed.result);
          lines.push('');
        }
      } else {
        lines.push(raw);
      }
    } else {
      lines.push(raw);
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  });

  return lines.join('\n').trimEnd();
}

function formatMessageLabel(role, type) {
  if (type === 'command') return 'Shell command';
  if (type === 'output') return 'Terminal output';
  if (role === 'user') return 'User';
  if (role === 'assistant') return 'Nexify (AI)';
  if (role === 'system') return 'System';
  return `${role} (${type})`;
}

/**
 * @param {'share' | 'clipboard'} method
 */
export function formatExportConfirmation(method) {
  if (method === 'share') {
    return [
      'NEXIFY EXPORT',
      '',
      'SESSION exportovaná ako Markdown.',
      'Zdieľané cez systémový share sheet.',
      'PIN a .env tajomstvá boli vyfiltrované.',
    ].join('\n');
  }

  return [
    'NEXIFY EXPORT',
    '',
    'SESSION exportovaná ako Markdown.',
    'Skopírované do schránky — vlož do Notes/Mail.',
    'PIN a .env tajomstvá boli vyfiltrované.',
  ].join('\n');
}

/**
 * @param {string} markdown
 * @param {{ navigator?: Navigator; document?: Document }} [scope]
 * @returns {Promise<{ method: 'share' | 'clipboard' }>}
 */
export async function deliverSessionMarkdown(markdown, scope = globalThis) {
  const nav = scope.navigator;
  const text = String(markdown || '');

  if (!text.trim()) {
    throw new Error('Empty export');
  }

  if (nav?.share) {
    const payload = { title: 'Nexify Session', text };
    const canShare = typeof nav.canShare === 'function' ? nav.canShare(payload) : true;
    if (canShare) {
      await nav.share(payload);
      return { method: 'share' };
    }
  }

  if (!nav?.clipboard?.writeText) {
    throw new Error('Clipboard unavailable');
  }

  await nav.clipboard.writeText(text);
  return { method: 'clipboard' };
}