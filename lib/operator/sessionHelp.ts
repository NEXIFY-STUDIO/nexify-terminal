export function isHelpCommand(input: unknown): boolean {
  const normalized = String(input || "").trim().toLowerCase()
  return normalized === "help" || normalized === "?" || normalized === "pomoc"
}

export function formatNexifyHelpReport({
  iphoneUi = "http://100.103.0.38:3322",
  pin = "0000",
}: {
  iphoneUi?: string
  pin?: string
} = {}): string {
  return [
    "NEXIFY HELP",
    "",
    "Príkazy (samostatne, bez $ a /):",
    "  help / ? / pomoc  → tento návod",
    "  status            → SESSION + health (nič nemaže)",
    "  restart           → reštart Mac stacku (launchd)",
    "  clear             → vymaž pamäť + reštart UI",
    "  export            → SESSION log ako Markdown (share / clipboard)",
    "",
    "Režimy vstupu (badge vľavo od mikrofónu):",
    "  AI   → text, Nexify navrhne $ chips",
    "  $    → shell príkaz na Macu ($ df -h)",
    "  /    → shell príkaz na Macu (/ ls)",
    "",
    "Tap-to-run:",
    "  Po AI odpovedi tapni cyan $ tlačidlo → príkaz na Macu",
    "",
    "Voice (v9):",
    "  Drž mikrofón → hovor → pusti → text v inpute → Enter",
    "",
    "Záložky:",
    "  Chat · Terminal · Files · System · Insolvency",
    "",
    `iPhone: ${iphoneUi}`,
    `PIN: ${pin}`,
    "Manuál: cyan tlačidlo v Chat headeri",
    "",
    "Operátor: status = čítaj | restart = Mac stack | clear = vymaž UI",
  ].join("\n")
}
