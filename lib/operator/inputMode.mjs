export function detectInputMode(input) {
  const trimmed = String(input || '').trimStart();
  if (trimmed.startsWith('$')) return 'shell';
  if (trimmed.startsWith('/')) return 'slash';
  return 'ai';
}

export function getInputPlaceholder(mode) {
  switch (mode) {
    case 'shell':
      return '$ príkaz na Mac…';
    case 'slash':
      return '/cmd — vykoná sa v shelli…';
    default:
      return 'Text → Nexify navrhne $ príkaz…';
  }
}

export function getInputModeLabel(mode) {
  switch (mode) {
    case 'shell':
      return '$';
    case 'slash':
      return '/';
    default:
      return 'AI';
  }
}

export function cycleInputMode(currentMode) {
  if (currentMode === 'ai') return 'shell';
  if (currentMode === 'shell') return 'slash';
  return 'ai';
}

export function applyInputModePrefix(input, mode) {
  const body = String(input || '').trim();
  const stripped = body.replace(/^[\$/]\s*/, '');

  if (mode === 'shell') {
    return stripped ? `$ ${stripped}` : '$ ';
  }
  if (mode === 'slash') {
    return stripped ? `/ ${stripped}` : '/ ';
  }
  return stripped;
}