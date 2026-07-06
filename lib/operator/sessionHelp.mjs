export function isHelpCommand(input) {
  const normalized = String(input || '').trim().toLowerCase();
  return normalized === 'help' || normalized === '?' || normalized === 'pomoc';
}

export function formatNexifyHelpReport({
  iphoneUi = 'http://100.103.0.38:3322',
  pin = '2366',
} = {}) {
  return [
    'NEXIFY HELP',
    '',
    'Príkazy (samostatne, bez $ a /):',
    '  help / ? / pomoc  → tento návod',
    '  status            → SESSION + health (nič nemaže)',
    '  clear             → vymaž pamäť + reštart UI',
    '',
    'Režimy vstupu (badge vľavo od mikrofónu):',
    '  AI   → text, Nexify navrhne $ chips',
    '  $    → shell príkaz na Macu ($ df -h)',
    '  /    → shell príkaz na Macu (/ ls)',
    '',
    'Tap-to-run:',
    '  Po AI odpovedi tapni cyan $ tlačidlo → príkaz na Macu',
    '',
    'Voice (v9):',
    '  Drž mikrofón → hovor → pusti → text v inpute → Enter',
    '',
    'Záložky:',
    '  Chat · Terminal · Files · System · Insolvency',
    '',
    `iPhone: ${iphoneUi}`,
    `PIN: ${pin}`,
    'Manuál: cyan tlačidlo v Chat headeri',
    '',
    'Operátor: status = čítaj | clear = vymaž',
  ].join('\n');
}