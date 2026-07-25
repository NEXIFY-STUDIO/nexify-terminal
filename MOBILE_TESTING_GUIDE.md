# Nexify Terminal — iPhone 17 Air Testing Guide

**Device:** iPhone 17 Air · 402×874px · Dynamic Island · DPR 3.0  
**Projekt:** `/Users/erikbabcan/HUB/01-Projekty/aaa-terminalnexify2-with-v-main`  
**iPhone URL:** `http://100.103.0.38:3322` (Tailscale → Mac)  
**PIN:** z `.env.local` (`NEXT_PUBLIC_PASSCODE`) alebo device-profile fallback  
**Posledná aktualizácia:** 2026-07-24 · integrity 105 · static 280 · live 80 (#251–#328)

---

## Gate (povinné pred merge)

```bash
cd /Users/erikbabcan/HUB/01-Projekty/aaa-terminalnexify2-with-v-main
pnpm test:integrity-60
pnpm test:iphone17-static
pnpm test:e2e
```

Live Playwright (samostatne — potrebuje bežiaci stack):

```bash
pnpm dev:all          # :3322 + hack-api :3021 + ai-proxy
pnpm test:iphone17-live
```

Alebo jeden príkaz (štart + healthcheck + live + teardown):

```bash
pnpm test:iphone17-live:ci
```

GitHub Actions job **`iphone17-live`** (po `test`) spúšťa ten istý wrapper.

---

## Live CI cesta (Playwright na Macu)

1. **Stack**
   ```bash
   pnpm install
   npx playwright install chromium   # raz
   pnpm dev:all
   ```
   Overenie: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3322/` → `200`

2. **Shell API**  
   `hacking-api` loguje `shell spawn mode=pty|pipe`.  
   Na Node 24 / broken `node-pty` je default **`pipe`** (deterministický fallback).  
   Vynútiť: `SHELL_USE_PTY=0` v `.env.local`.

3. **Live suite**
   ```bash
   pnpm test:iphone17-live
   ```
   Zahŕňa lockscreen + authenticated + screens + **operator #321–#328**.
   CI: `pnpm test:iphone17-live:ci` alebo Actions job `iphone17-live`.

4. **CI tip**  
   Spustiť live job až po `dev:all` healthchecke; bez `:3322` sa testy skip/failujú.  
   Odporúčaný order v pipeline: `integrity-60` → `iphone17-static` → `e2e` → (optional) `iphone17-live`.

---

## iPhone 17 Air — hybrid suite

| Príkaz | Čo beží |
|--------|---------|
| `pnpm run test:e2e` | lint + core + github-iphone + iPhone static finalize |
| `pnpm run test:iphone17-static` | #001–#280 (9 modulov) |
| `pnpm run test:iphone17-300` | 280 static + live orchestrátor |
| `pnpm run test:iphone17-live` | Playwright #251–#327 (79 testov) |
| `pnpm run test:github-iphone` | post-`git pull` integrity |
| `pnpm run test:catalog` | prehľad kategórií |

### Live bloky

| Blok | IDs | Focus |
|------|-----|-------|
| Lockscreen | #251–#260 | PIN unlock |
| Authenticated | #261–#300 | tabs, safe-area, WebGL, panels |
| Screens | #301–#320 | 6 tabs, 44px hit targets, paste |
| Operator | #321–#328 | Files roundtrip, swipe-back, `$` shell, voice, export redact |

---

## Fyzický iPhone 17 Air (Tailscale)

1. Tailscale **ON** na iPhone aj Macu  
2. Safari → `http://100.103.0.38:3322`  
3. PIN z `.env.local`  
4. **Zdieľať → Pridať na plochu** (PWA standalone)  
5. Otestuj: tabs (≥44px), `$` chip, voice hold→Enter, `export`, Files Save above-the-fold

### Operátor (v1–v10)

| Akcia | Správanie |
|-------|-----------|
| Text | AI → `$` chips (tap-to-run) |
| `$ cmd` / `/ cmd` | Shell na Macu + follow-up |
| `help` / `status` / `clear` / `export` | Meta príkazy |
| Drž mikrofón | Speech → input → **Enter** |
| Export | Markdown share / clipboard (`[REDACTED]`) |

Megaprompt: `services/ai-proxy/ai-proxy.mjs` · QA prompt: `IPHONE17_AIR_PROMPT.md`
