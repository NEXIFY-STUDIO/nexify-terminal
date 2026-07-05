/**
 * Internal prompt sent after a shell command finishes (v4 proactive follow-up).
 */
export function buildShellFollowUpQuestion(command, session = {}) {
  const cmd = String(command || '').trim() || 'unknown';
  const { failedLast, recentOutput } = session;

  if (failedLast) {
    return [
      `Príkaz "${cmd}" na Macu zlyhal.`,
      'SESSION má recent_output a failed_last:true.',
      'Daj INTENT+RESULT — čo zlyhalo a čo user uvidí na telefóne.',
      'ACTION len ak navrhueš opravu (max 2 samostatné $ riadky).',
    ].join(' ');
  }

  if (!recentOutput) {
    return [
      `Príkaz "${cmd}" skončil bez výstupu.`,
      'Daj INTENT+RESULT — čo to znamená pre usera na telefóne. ACTION nechaj prázdne.',
    ].join(' ');
  }

  return [
    `Príkaz "${cmd}" dokončený.`,
    'Interpretuj recent_output v SESSION pre usera na telefóne.',
    'INTENT+RESULT, ACTION prázdne alebo max 1 follow-up $ príkaz.',
  ].join(' ');
}