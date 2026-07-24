# Nexify Terminal — iPhone 17 Air Testing Guide

**Device:** iPhone 17 Air · 402×874px · Dynamic Island · DPR 3.0  
**Projekt:** `/Users/erikbabcan/aaa-terminalnexify2-with-v-main`  
**iPhone URL:** `http://100.103.0.38:3322` (Tailscale → Mac)  
**PIN:** `0000`  
**Posledná aktualizácia:** 2026-07-06 · E2E 451/451 ✅

---

## Jeden príkaz — full test (Mac)

```bash
cd /Users/erikbabcan/aaa-terminalnexify2-with-v-main && pnpm run test:e2e
```

Potom reštart stacku:

```bash
launchctl kickstart -k gui/$(id -u)/com.nexify.terminal
```

---

## iPhone 17 Air — 330 test suite (hybrid)

| Príkaz | Čo beží |
|--------|---------|
| `pnpm run test:e2e` | lint + core + github-iphone + iPhone static finalize |
| `pnpm run test:iphone17-static` | #001–#260 (8 modulov) |
| `pnpm run test:iphone17-300` | 260 static + 70 Playwright live (screens #301–#320) |
| `pnpm run test:iphone17-live` | Playwright lockscreen + authenticated + screens |
| `pnpm run test:github-iphone` | post-`git pull` integrity |
| `pnpm run test:catalog` | prehľad kategórií |

Playwright (prvýkrát):

```bash
pnpm install && npx playwright install chromium
```

### Static moduly (#001–#260)

| Modul | IDs | Count | Focus |
|-------|-----|-------|-------|
| Viewport & Display | #001–#040 | 40 | viewport meta, overflow lock |
| PWA & Standalone | #041–#075 | 35 | manifest, SW, icons |
| Safe Area & Dynamic Island | #076–#105 | 30 | env(safe-area-inset-*) |
| Lockscreen & Auth | #106–#140 | 35 | PIN, WebAuthn |
| Gestures & Navigation | #141–#180 | 40 | swipe, long-press, paste, dual-chat |
| Haptics & Audio | #181–#205 | 25 | vibrate + Web Audio fallback |
| WebGL & Particles | #206–#240 | 35 | orb, dpr throttle |
| UI Animations | #241–#260 | 20 | pulse, slide-in |

### Live Playwright (#251–#320)

| Blok | IDs | Focus |
|------|-----|-------|
| Lockscreen | #251–#260 | PIN unlock |
| Viewport / tabs / safe-area / WebGL | #261–#294 | iPhone 17 Air stability |
| Screen panels | #295–#300 | Terminal, Files, System, Insolvency, Dual Coder |
| Screens E2E | #301–#320 | all 6 tabs, hit targets, long-press, paste fallback |

Vyžaduje bežiaci stack: `pnpm dev:all` na `:3322`.

Vyžaduje bežiaci `pnpm dev:all` na `:3322`.

---

## Fyzický iPhone 17 Air (Tailscale)

1. Tailscale **ON** na iPhone aj Macu  
2. Safari → `http://100.103.0.38:3322`  
3. PIN **0000**  
4. **Zdieľať → Pridať na plochu** (PWA standalone)  
5. Otestuj: swipe záložky, chat input, tap-to-run `$` chips, voice (drž mikrofón), `export`

### Operátor na iPhone (v1–v10)

| Akcia | Správanie |
|-------|-----------|
| Text | AI → `$` chips (tap-to-run) |
| `$ cmd` / `/ cmd` | Shell na Macu + follow-up |
| `help` / `status` / `clear` / `export` | Meta príkazy |
| Drž mikrofón | Speech → input → **Enter** |
| Export menu | Markdown share / clipboard |

Megaprompt: `services/ai-proxy/ai-proxy.mjs` · QA prompt: `IPHONE17_AIR_PROMPT.md`

---

## Viewport & stabilita

- **Žiadny scroll** — `html/body` fixed, `overflow: hidden`  
- **Žiadny zoom** — `userScalable: false`, min/max scale 1  
- **Safe area** — `viewport-fit=cover`, padding pre Dynamic Island  
- **Touch** — `touch-action: manipulation` na tlačidlách  

### Očakávané hodnoty

```
innerWidth:  402px (alebo device-width v standalone)
innerHeight: ~874px
scrollY/X:   0
```

---

## Manuálny checklist (iPhone)

- [ ] `pnpm run test:e2e` green na Macu  
- [ ] Health 200: `:3322/api/health`, `:3021/health`, `:8788/health`  
- [ ] PWA na ploche otvorí standalone (bez Safari chrome)  
- [ ] PIN 0000 odomkne lockscreen  
- [ ] Swipe: Chat ↔ Terminal ↔ Files ↔ System  
- [ ] Chat: text → AI chips → tap `$` beží na Macu  
- [ ] Voice: drž mikrofón → text → Enter  
- [ ] `export` alebo Export → Markdown  
- [ ] Cyan **Manuál** v headeri funguje  
- [ ] Žiadne chyby v Safari konzole (Develop → iPhone)

---

## Po `git pull`

```bash
cd /Users/erikbabcan/aaa-terminalnexify2-with-v-main
git pull origin main
pnpm install
pnpm run test:e2e
launchctl kickstart -k gui/$(id -u)/com.nexify.terminal
```

---

## Súbory

| Cesta | Účel |
|-------|------|
| `IPHONE17_AIR_PROMPT.md` | ~2000 znakov QA prompt |
| `scripts/test-iphone17-air-300.mjs` | Hybrid runner |
| `scripts/iphone17-tests/` | 8 static modulov |
| `scripts/iphone17-playwright/` | Live #251–#300 |
| `scripts/test-e2e-finalize.mjs` | E2E orchestrátor |
| `scripts/test-catalog.mjs` | 14 test kategórií |

---

**14 test kategórií · 505 číslovaných v katalógu · 451 E2E static · iPhone pull-safe: 7**