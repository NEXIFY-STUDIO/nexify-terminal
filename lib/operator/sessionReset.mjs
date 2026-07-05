/** Keys that hold Nexify operator / chat session memory (not PIN auth). */
export const NEXIFY_MEMORY_STORAGE_KEYS = [
  'nexify_chat_history',
];

export function isClearSessionCommand(input) {
  return String(input || '').trim().toLowerCase() === 'clear';
}

/**
 * Wipe operator balancing memory from browser storage.
 * Keeps nexify_authenticated and nexify_active_model.
 */
export function clearNexifySessionMemory(storage) {
  const target =
    storage ||
    (typeof globalThis !== 'undefined' && globalThis.localStorage) ||
    null;

  if (!target || typeof target.removeItem !== 'function') {
    return { cleared: [], kept: ['nexify_authenticated', 'nexify_active_model'] };
  }

  const cleared = [];
  for (const key of NEXIFY_MEMORY_STORAGE_KEYS) {
    if (target.getItem(key) != null) {
      target.removeItem(key);
      cleared.push(key);
    }
  }

  return {
    cleared,
    kept: ['nexify_authenticated', 'nexify_active_model'],
  };
}

export function restartNexifyApp() {
  if (typeof globalThis !== 'undefined' && globalThis.location?.reload) {
    globalThis.location.reload();
  }
}