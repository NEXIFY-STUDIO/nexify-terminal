/**
 * Extract runnable shell commands from Nexify Operator responses.
 * Supports plain `$ cmd` lines and INTENT/ACTION/RESULT ACTION blocks.
 */
export function extractShellCommands(text) {
  if (!text || typeof text !== 'string') return [];

  const seen = new Set();
  const commands = [];

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const dollar = trimmed.match(/^\$\s*(.+)$/);
    if (dollar?.[1]) {
      pushUnique(commands, seen, dollar[1].trim());
      continue;
    }

    const actionDollar = trimmed.match(/^ACTION:\s*\$\s*(.+)$/i);
    if (actionDollar?.[1]) {
      pushUnique(commands, seen, actionDollar[1].trim());
      continue;
    }

    const actionBare = trimmed.match(/^ACTION:\s*(.+)$/i);
    if (actionBare?.[1] && !/^INTENT:/i.test(actionBare[1])) {
      const candidate = actionBare[1].trim();
      if (looksLikeShellCommand(candidate)) {
        pushUnique(commands, seen, candidate.replace(/^\$\s*/, ''));
      }
    }
  }

  return commands;
}

function looksLikeShellCommand(text) {
  if (!text || text.length > 200) return false;
  if (/^(INTENT|RESULT):/i.test(text)) return false;
  return /^(\$|[\w./~-])/.test(text);
}

function pushUnique(list, seen, cmd) {
  if (!cmd || seen.has(cmd)) return;
  seen.add(cmd);
  list.push(cmd);
}

export function normalizeShellInput(raw) {
  return String(raw || '').replace(/^[\$/]\s*/, '').trim();
}