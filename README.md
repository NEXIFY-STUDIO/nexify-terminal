# Nexify Terminal — kompletný manuál

**Nexify** nie je chatbot. Je to rozhranie k tvojmu Macu cez Tailscale — ovládaš ho z iPhonu ako operátor domáceho uzla.

| Položka | Hodnota |
|---------|---------|
| **Repozitár** | `youh4ck3dme/nexify-terminal` (private) |
| **Projekt na Macu** | `/Users/erikbabcan/aaa-terminalnexify2-with-v-main` |
| **UI port** | `3322` |
| **Hack API (shell)** | `3021` |
| **AI proxy** | `8788` |
| **PIN (lockscreen)** | `2366` |
| **Mac Tailscale IP** | `100.103.0.38` |
| **iPhone Tailscale IP** | `100.103.153.97` |

---

## Obsah

1. [Čo Nexify robí](#1-čo-nexify-robí)
2. [Architektúra a porty](#2-architektúra-a-porty)
3. [Prvé spustenie (Mac)](#3-prvé-spustenie-mac)
4. [Kde a ako zadávaš príkazy](#4-kde-a-ako-zadávaš-príkazy) ← hlavná časť
5. [Režimy vstupu: AI / $ / /](#5-režimy-vstupu-ai----)
6. [Nexify Operator (AI persona)](#6-nexify-operator-ai-persona)
7. [Prístup z iPhonu (Tailscale)](#7-prístup-z-iphonu-tailscale)
8. [Príkazy v macOS Termináli (údržba)](#8-príkazy-v-macos-termináli-údržba)
9. [Launch Agent — autostart](#9-launch-agent--autostart)
10. [Konfigurácia `.env.local`](#10-konfigurácia-envlocal)
11. [Testy a CI](#11-testy-a-ci)
12. [Riešenie problémov](#12-riešenie-problémov)
13. [Bezpečnosť](#13-bezpečnosť)

---

## 1. Čo Nexify robí

Nexify Terminal je PWA rozhranie optimalizované pre iPhone. Z telefónu vieš:

- **Chatovať s Nexify Operatorom** — AI navrhne `$` príkazy na Mac
- **Spúšťať shell príkazy** na Macu (`$` alebo `/` prefix)
- **Tap-to-run** — každý `$` riadok v AI odpovedi je tlačidlo
- **Auto follow-up** — po príkaze AI automaticky interpretuje výstup terminálu
- **Prehliadať súbory**, **sledovať systém**, **plný PTY terminál**

Stack beží na Macu. iPhone je len klient cez Tailscale VPN.

---

## 2. Architektúra a porty

```
┌─────────────────┐     Tailscale      ┌──────────────────────────────────┐
│  iPhone (PWA)   │ ─────────────────► │  Mac (domáci uzol)               │
│  Safari / Home  │   100.103.0.38     │                                  │
│  Screen         │                    │  :3322  Next.js UI (Nexify)      │
└─────────────────┘                    │  :3021  Hacking API (remote shell) │
                                       │  :8788  AI Proxy (Nexify Operator)│
                                       └──────────────────────────────────┘
```

| Služba | Port | Bind | Health |
|--------|------|------|--------|
| Next.js UI | `3322` | `0.0.0.0` | `GET /api/health` |
| Hacking API | `3021` | `0.0.0.0` | `GET /health` |
| AI Proxy | `8788` | `0.0.0.0` | `GET /health` |

Všetky tri služby štartuje `scripts/dev-all.sh` (ručne alebo cez Launch Agent).

---

## 3. Prvé spustenie (Mac)

### 3.1 Požiadavky

- macOS s Node.js 22+ (odporúčané cez nvm)
- `pnpm` 9+
- Tailscale nainštalovaný a prihlásený na Macu aj iPhone
- MongoDB **nie je** potrebná pre Nexify Terminal

### 3.2 Inštalácia závislostí

```bash
cd /Users/erikbabcan/aaa-terminalnexify2-with-v-main

pnpm install
npm install --prefix services/hacking-api --ignore-scripts
npm install --prefix services/ai-proxy --ignore-scripts
```

### 3.3 Environment

```bash
cp .env.example .env.local
# Vyplň tokeny a API kľúče — nikdy necommituj .env.local
```

Minimálne nastav:

- `HACK_API_TOKEN`, `SHELL_TOKEN`, `NEXTAUTH_SECRET` — `openssl rand -hex 32`
- `NEXT_PUBLIC_PASSCODE=2366`
- `SHELL_CWD_ALLOWLIST=/Users/erikbabcan`
- `TAILSCALE_ALLOWED_IP=100.103.153.97` (IP iPhonu v Tailscale)
- `ALLOWED_ORIGIN` a `NEXT_PUBLIC_DEV_CONNECT_SRC` s Mac Tailscale IP `100.103.0.38:3322`
- AI provider kľúč podľa `AI_PROVIDER` (mistral / github-models / gamma)

### 3.4 Ručné spustenie stacku

```bash
cd /Users/erikbabcan/aaa-terminalnexify2-with-v-main
pnpm dev:all
```

Overenie:

```bash
curl -s http://127.0.0.1:3322/api/health
curl -s http://127.0.0.1:3021/health
curl -s http://127.0.0.1:8788/health
```

Všetky tri musia vrátiť `status: ok` (alebo ekvivalent).

---

## 4. Kde a ako zadávaš príkazy

Toto je najdôležitejšia časť manuálu. Nexify má **tri miesta**, kam môžeš zadávať príkazy — každé má iný účel.

### 4.1 Chat input (dolný panel) — primárne miesto

**Kde:** záložka **Chat** → spodný textový panel (medzi tlačidlom `N` a šípkou odoslať).

**Ako:**

| Čo napíšeš | Čo sa stane |
|------------|-------------|
| Bežný text, napr. `ukáž disk` | Ide na **Nexify Operator (AI)**. Odpoveď obsahuje navrhované `$` príkazy ako tap-to-run tlačidlá. |
| `$ df -h` | Príkaz sa **okamžite spustí v shelli na Macu**. AI potom automaticky interpretuje výstup (follow-up). |
| `/ ls -la` | Rovnako ako `$` — spustí sa v shelli na Macu. |
| `Enter` | Odošle správu (bez `Shift+Enter` = jeden riadok). |
| `Shift+Enter` | Nový riadok v inpute. |

**Badge režimu** (cyan tlačidlo `AI` / `$` / `/` vľavo od mikrofónu):

- Tapni badge → cykluje režimy: `AI` → `$` → `/` → `AI`
- Placeholder sa mení podľa režimu

**Príklady do chat inputu:**

```
ukáž voľné miesto na disku          → AI navrhne $ df -h
$ git status                        → shell na Macu + auto follow-up
$ cd ~/Projects && ls               → shell na Macu
/ pwd                               → shell na Macu
```

### 4.2 Tap-to-run chips (pod AI odpoveďou)

**Kde:** pod rozbalenou AI odpoveďou (modré/cyan tlačidlá s `$ príkaz`).

**Ako:** jeden tap = príkaz sa pošle do shellu na Macu. Nemusíš nič prepisovať.

**Kedy:** keď AI odpovie v formáte:

```
INTENT: Kontrola disku.
ACTION:
$ df -h
$ du -sh ~
RESULT: Uvidíš využitie diskov.
```

Každý riadok `$ ...` sa zobrazí ako samostatné tlačidlo.

### 4.3 Záložka Terminal (plný PTY)

**Kde:** horný prepínač **Terminal** (nie Chat).

**Ako:** plnohodnotný `xterm.js` terminál pripojený na ten istý shell session ako Chat. Píšeš priamo ako v Termináli na Macu — **bez** `$` prefixu.

**Kedy použiť:**

- interaktívne programy (`vim`, `htop`, `npm run dev`)
- keď potrebuješ vidieť raw ANSI výstup
- dlhšie session s viacerými príkazmi za sebou

**Poznámka:** príkazy z Chatu (`$ ...`) a z Terminal tabu zdieľajú **tú istú PTY reláciu**.

### 4.4 macOS Terminál (údržba stacku)

**Kde:** Terminal.app / iTerm na Macu — **nie** v Nexify UI.

**Na čo:** spúšťanie, reštart a diagnostika samotného Nexify stacku (pozri [kapitolu 8](#8-príkazy-v-macos-termináli-údržba)).

---

## 5. Režimy vstupu: AI / $ / /

| Badge | Prefix | Kam ide | Príklad |
|-------|--------|---------|---------|
| `AI` | žiadny | AI proxy → Nexify Operator | `koľko RAM?` |
| `$` | `$` | Shell na Macu | `$ top -l 1` |
| `/` | `/` | Shell na Macu | `/ whoami` |

**Status strip** (pod headerom v Chate):

```
chat · Nexify :3322 · :3021 · :8788 · last: df -h · failed
```

- `last:` — posledný shell príkaz
- `failed` (červené) — posledný príkaz skončil chybou (`zsh: command not found`, atď.)

---

## 6. Nexify Operator (AI persona)

Nexify AI nie je „Ako vám môžem pomôcť?“ chatbot. Je to operátor Macu.

### Správanie

- Začína stavom zo **SESSION** (workspace, stack, last_command, recent_output, failed_last)
- Text bez prefixu → navrhne `$` príkazy (tap-to-run)
- `$` / `/` od usera → príkaz už beží, AI len interpretuje (follow-up)
- Po každom shell príkaze → **automatický follow-up** s INTENT + RESULT

### Formát AI odpovede

```
INTENT: jedna veta
ACTION:
$ príkaz_1
$ príkaz_2
RESULT: max 2 vety — čo uvidíš na Macu
```

### Výber modelu

Horný panel → dropdown modelu: Mistral Small, Gemini, GPT-4.1 Mini (GitHub Models).

---

## 7. Prístup z iPhonu (Tailscale)

### 7.1 Predpoklady

1. Mac aj iPhone v **tom istom Tailscale účte**
2. Stack beží na Macu (Launch Agent alebo `pnpm dev:all`)
3. Tailscale VPN zapnutá na iPhone

### 7.2 Otvorenie UI

V Safari na iPhone:

```
http://100.103.0.38:3322
```

### 7.3 Lockscreen

1. Face ID / Touch ID (ak nakonfigurované), alebo
2. PIN: **`2366`**

### 7.4 Pridanie na Home Screen (PWA)

Safari → Zdieľať → **Pridať na plochu**. Otvára sa v standalone režime bez adresného riadku.

### 7.5 Gestá

Swipe doľava/doprava: `Chat ↔ Terminal ↔ Files ↔ System ↔ Insolvency`

---

## 8. Príkazy v macOS Termináli (údržba)

Tieto príkazy zadávaj v **Terminal.app na Macu**, nie v Nexify UI.

### Spustenie a reštart stacku

```bash
# Reštart cez Launch Agent (odporúčané)
launchctl kickstart -k gui/$(id -u)/com.nexify.terminal

# Ručný štart (ak Launch Agent nie je načítaný)
cd /Users/erikbabcan/aaa-terminalnexify2-with-v-main
pnpm dev:all
```

### Launch Agent — load / unload

```bash
# Aktivovať autostart
launchctl load ~/Library/LaunchAgents/com.nexify.terminal.plist

# Vypnúť autostart
launchctl unload ~/Library/LaunchAgents/com.nexify.terminal.plist

# Stav
launchctl list | grep com.nexify.terminal
```

### Logy

```bash
tail -f /Users/erikbabcan/aaa-terminalnexify2-with-v-main/launchd-out.log
tail -f /Users/erikbabcan/aaa-terminalnexify2-with-v-main/launchd-err.log
```

### Kontrola portov

```bash
lsof -i :3322 -i :3021 -i :8788
```

### Tailscale IP

```bash
tailscale ip -4
tailscale status
```

### Testy (pred deployom / po zmene)

```bash
cd /Users/erikbabcan/aaa-terminalnexify2-with-v-main
pnpm run test:all      # 111 testov
pnpm run lint          # TypeScript check
node scripts/test-stability-network.mjs   # sieť + launchd soak
```

### Git sync

```bash
cd /Users/erikbabcan/aaa-terminalnexify2-with-v-main
git pull fork main
launchctl kickstart -k gui/$(id -u)/com.nexify.terminal
```

---

## 9. Launch Agent — autostart

| Položka | Cesta / hodnota |
|---------|-----------------|
| Plist | `~/Library/LaunchAgents/com.nexify.terminal.plist` |
| Skript | `scripts/dev-all.sh` |
| Working dir | `/Users/erikbabcan/aaa-terminalnexify2-with-v-main` |
| Label | `com.nexify.terminal` |
| KeepAlive | áno — po páde sa reštartuje |

Po každej zmene kódu alebo `.env.local`:

```bash
launchctl kickstart -k gui/$(id -u)/com.nexify.terminal
```

---

## 10. Konfigurácia `.env.local`

Súbor: `/Users/erikbabcan/aaa-terminalnexify2-with-v-main/.env.local`  
Šablóna: `.env.example`  
**Nikdy necommituj** — je v `.gitignore`.

### Kritické premenné

| Premenná | Účel |
|----------|------|
| `NEXT_PUBLIC_PASSCODE` | PIN lockscreen (`2366`) |
| `TAILSCALE_ALLOWED_IP` | IP iPhonu povolená middleware (`100.103.153.97`) |
| `SHELL_CWD_ALLOWLIST` | Kde shell smie `cd` (`/Users/erikbabcan`) |
| `HACK_API_TOKEN` / `SHELL_TOKEN` | Tokeny medzi Next a hack-api |
| `AI_PROVIDER` + príslušný API kľúč | AI model |
| `ALLOWED_ORIGIN` | CORS pre hack-api (localhost + Tailscale IP) |
| `NEXT_PUBLIC_DEV_CONNECT_SRC` | CSP connect-src pre Tailscale |

CI používa fake fixture `.env.ci` — len pre GitHub Actions, nie pre produkciu.

---

## 11. Testy a CI

| Príkaz | Čo testuje |
|--------|------------|
| `pnpm run test:all` | 60 integrity + security + PIN + 21 operator + 18 persona + 18 UX = **111** |
| `pnpm run test:nexify-operator` | AI proxy, SESSION, persona |
| `pnpm run test:nexify-persona` | Prompt pravidlá v1–v4 |
| `pnpm run test:operator-ux` | tap-to-run, input modes, session context |
| `node scripts/test-stability-network.mjs` | Tailscale, burst, launchd recovery |

GitHub Actions: `.github/workflows/ci.yml` — beží na každý push do `main`.

---

## 12. Riešenie problémov

| Problém | Riešenie |
|---------|----------|
| UI nejde z iPhonu | Skontroluj Tailscale na oboch zariadeniach; URL musí byť `http://100.103.0.38:3322` |
| `403 Forbidden` | IP iPhonu nie je v `TAILSCALE_ALLOWED_IP`; over `tailscale status` |
| Shell neodpovedá | `curl http://127.0.0.1:3021/health`; reštart `launchctl kickstart ...` |
| AI neodpovedá | `curl http://127.0.0.1:8788/health`; skontroluj API kľúč v `.env.local` |
| Po `git pull` stará verzia | `launchctl kickstart -k gui/$(id -u)/com.nexify.terminal` |
| `.env.local` prepísaný | Obnov z backupu `.env.local.bak.*` — nikdy nespúšťaj `cp .env.ci .env.local` lokálne |
| Port obsadený | `lsof -t -i :3322 \| xargs kill -9` (dev-all to robí pri štarte) |

---

## 13. Bezpečnosť

- Middleware blokuje prístup mimo localhost + autorizovaný Tailscale klient (iPhone)
- Shell beží len v `SHELL_CWD_ALLOWLIST`
- Tokeny (`HACK_API_TOKEN`, `SHELL_TOKEN`) len server-side — nikdy v prehliadači
- Repozitár je **private** — secrets len v `.env.local` na Macu
- PIN `2366` + voliteľný WebAuthn (Face ID)

---

## Rýchla referenčná karta

```
┌─────────────────────────────────────────────────────────────┐
│  NEXIFY — KDE ČO PÍSAŤ                                      │
├─────────────────────────────────────────────────────────────┤
│  Chat input (telefón/Mac browser)                           │
│    text bez prefixu  →  AI navrhne $ príkazy               │
│    $ príkaz            →  shell na Macu + auto follow-up    │
│    / príkaz            →  shell na Macu                     │
│    tap chip pod AI     →  shell na Macu                     │
├─────────────────────────────────────────────────────────────┤
│  Záložka Terminal      →  priamy PTY (bez $ prefixu)        │
├─────────────────────────────────────────────────────────────┤
│  macOS Terminál        →  launchctl, pnpm dev:all, testy    │
├─────────────────────────────────────────────────────────────┤
│  iPhone URL            →  http://100.103.0.38:3322          │
│  PIN                   →  2366                              │
│  Reštart stacku        →  launchctl kickstart -k gui/$(id -u)/com.nexify.terminal │
└─────────────────────────────────────────────────────────────┘
```

---

*Nexify Terminal · private repo · main branch · 111 automated tests*