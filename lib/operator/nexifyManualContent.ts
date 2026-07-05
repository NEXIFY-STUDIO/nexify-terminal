export const NEXIFY_PROJECT_ROOT = "/Users/erikbabcan/aaa-terminalnexify2-with-v-main"

export const NEXIFY_PATHS = {
  project: NEXIFY_PROJECT_ROOT,
  envLocal: `${NEXIFY_PROJECT_ROOT}/.env.local`,
  envExample: `${NEXIFY_PROJECT_ROOT}/.env.example`,
  envCi: `${NEXIFY_PROJECT_ROOT}/.env.ci`,
  envAiProxy: `${NEXIFY_PROJECT_ROOT}/services/ai-proxy/.env`,
  envBackup: `${NEXIFY_PROJECT_ROOT}/.env.local.bak.1780101747`,
  devAll: `${NEXIFY_PROJECT_ROOT}/scripts/dev-all.sh`,
  launchAgentPlist: "/Users/erikbabcan/Library/LaunchAgents/com.nexify.terminal.plist",
  launchdOut: `${NEXIFY_PROJECT_ROOT}/launchd-out.log`,
  launchdErr: `${NEXIFY_PROJECT_ROOT}/launchd-err.log`,
  readme: `${NEXIFY_PROJECT_ROOT}/README.md`,
} as const

export const NEXIFY_URLS = {
  iphoneUi: "http://100.103.0.38:3322",
  macLocalUi: "http://127.0.0.1:3322",
  vercelUi: "https://aaa-terminalnexify2-with-v-main.vercel.app",
  healthUi: "http://127.0.0.1:3322/api/health",
  healthHack: "http://127.0.0.1:3021/health",
  healthAi: "http://127.0.0.1:8788/health",
  pin: "2366",
} as const

export type ManualSection = {
  id: string
  title: string
  lines: string[]
}

export const NEXIFY_MANUAL_SECTIONS: ManualSection[] = [
  {
    id: "commands",
    title: "Kde zadávaš príkazy",
    lines: [
      "Chat input (dole) — text → AI navrhne $ chips",
      "Chat input — $ df -h alebo / ls → shell na Macu + auto follow-up",
      "Tap chips pod AI odpoveďou → jeden tap = príkaz na Macu",
      "Záložka Terminal → priamy PTY (bez $ prefixu)",
      "macOS Terminál → launchctl, testy, údržba stacku",
      "Badge AI / $ / / vľavo od mikrofónu → prepína režim vstupu",
    ],
  },
  {
    id: "iphone",
    title: "iPhone (Tailscale + PWA)",
    lines: [
      `1. Tailscale ON na iPhone aj Macu`,
      `2. Safari → ${NEXIFY_URLS.iphoneUi}`,
      `3. PIN: ${NEXIFY_URLS.pin}`,
      "4. Zdieľať → Pridať na plochu (PWA standalone)",
      "5. Swipe vľavo/vpravo: Chat ↔ Terminal ↔ Files ↔ System",
      "6. Face ID: funguje ak Safari ponúkne WebAuthn (HTTP cez TS môže obmedziť)",
      "7. Tap-to-run: po AI odpovedi tapni cyan $ tlačidlo",
    ],
  },
  {
    id: "env",
    title: "ENV súbory — Mistral kľúče",
    lines: [
      `Hlavný: ${NEXIFY_PATHS.envLocal}`,
      `AI proxy (standalone): ${NEXIFY_PATHS.envAiProxy}`,
      `Šablóna: ${NEXIFY_PATHS.envExample}`,
      "NIKDY necommituj .env.local",
      "AI_PROVIDER=mistral",
      "MISTRAL_API_KEY_1=primary-kľúč",
      "MISTRAL_API_KEY_2=backup-kľúč (failover)",
      "MISTRAL_MODEL=mistral-small-latest",
      "Launch Agent načíta .env.local cez dev-all.sh — stačí root súbor",
    ],
  },
  {
    id: "macos",
    title: "macOS príkazy (presné cesty)",
    lines: [
      `cd ${NEXIFY_PROJECT_ROOT}`,
      "launchctl kickstart -k gui/$(id -u)/com.nexify.terminal",
      `pnpm dev:all`,
      "pnpm run test:all",
      `tail -f ${NEXIFY_PATHS.launchdErr}`,
      "lsof -i :3322 -i :3021 -i :8788",
      "curl -s http://127.0.0.1:3322/api/health",
      "curl -s http://127.0.0.1:8788/health",
      `git pull fork main && launchctl kickstart -k gui/$(id -u)/com.nexify.terminal`,
    ],
  },
  {
    id: "works",
    title: "Čo funguje / čo je stub",
    lines: [
      "✓ Chat + Mistral AI (MISTRAL_API_KEY_1 v .env.local)",
      "✓ Shell $ / / + tap-to-run + auto follow-up",
      "✓ Terminal, Files, System, Insolvency",
      "✓ PIN 2366, Tailscale lockdown (verejné IP → 403)",
      "✗ Export PDF/MD/JSON — len UI",
      "✗ Mikrofón — len animácia, žiadny speech-to-text",
      "✗ Gamma/GitHub Models bez API kľúča",
    ],
  },
  {
    id: "vercel",
    title: "Vercel vs. Mac (Tailscale)",
    lines: [
      `Primárny režim: ${NEXIFY_URLS.iphoneUi} — plný shell + AI`,
      `Vercel UI only: ${NEXIFY_URLS.vercelUi} — bez Mac backendu`,
      "Shell/AI na Verceli: 502/503 (127.0.0.1 nedosiahnuteľný z cloudu)",
      `ENV šablóna: ${NEXIFY_PROJECT_ROOT}/vercel.env.example`,
      `Sync: bash ${NEXIFY_PROJECT_ROOT}/scripts/sync-vercel-env.sh`,
      "DISABLE_TAILSCALE_LOCKDOWN=true na Vercel Production",
    ],
  },
  {
    id: "operator",
    title: "Nexify Operator (v1–v4)",
    lines: [
      "Si Nexify — nie chatbot. Rozhranie k Macu cez Tailscale.",
      "Začína stavom SESSION: workspace, stack, last_command, recent_output",
      "Text → navrhni $ príkazy (samostatné riadky, max 3)",
      "Po $ príkaze → auto INTENT+RESULT interpretácia výstupu",
      "failed_last:true → neopakuj príkaz, navrhni opravu",
    ],
  },
]