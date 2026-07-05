const FAILURE_PATTERNS = [
  /command not found/i,
  /no such file or directory/i,
  /permission denied/i,
  /^Error:/im,
  /\bzsh:\s+/i,
  /\bbash:\s+/i,
  /\bfatal:/i,
  /cannot find/i,
  /ENOENT/i,
  /not recognized as an internal or external command/i,
];

export function stripAnsiForSession(text) {
  if (!text) return '';
  return String(text)
    .replace(/\u001b\][0-9;]*[^\u0007\u001b]*(?:\u0007|\u001b\\)/g, '')
    .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

export function getLastCommandFromMessages(messages = []) {
  const last = [...messages].reverse().find((m) => m?.type === 'command');
  if (!last?.content) return null;
  return String(last.content).replace(/^\$\s*/, '').trim() || null;
}

export function getRecentOutputFromMessages(messages = [], maxLen = 500) {
  const lastOutput = [...messages].reverse().find((m) => m?.type === 'output');
  if (!lastOutput?.content) return null;

  const cleaned = stripAnsiForSession(lastOutput.content);
  if (!cleaned) return null;
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(-maxLen);
}

export function detectFailedLast(output) {
  if (!output) return false;
  return FAILURE_PATTERNS.some((pattern) => pattern.test(output));
}

export function buildSessionFields(messages = []) {
  const recentOutput = getRecentOutputFromMessages(messages);
  return {
    lastCommand: getLastCommandFromMessages(messages),
    recentOutput,
    failedLast: detectFailedLast(recentOutput),
  };
}