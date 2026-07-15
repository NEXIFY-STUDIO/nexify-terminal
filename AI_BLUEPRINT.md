# Nexify Terminal: AI Blueprint & System Audit

Tento dokument slúži ako technický blueprint a auditný manuál pre AI agentov a vývojárov pracujúcich na repozitári **Nexify Terminal**. Obsahuje kompletný zoznam funkcií, post-mortem status, zoznam chýbajúcich/mockovaných komponentov, 5 promptov pre vylepšenie a inštrukcie pre E2E testovanie.

---

## 🚨 Systémový Status & Post-Mortem Incident Report

### 1. Build & Kompilácia
- **TypeScript & Typové overenie (`npx tsc --noEmit --skipLibCheck`):** `✅ PASSED`. Všetky predchádzajúce chybové stavy typovania v súboroch `components/insolvency-monitor.tsx` (riadky 380, 391), `components/auth-guard.tsx` a `components/chat-area.tsx` boli plne odstránené a typy skompilujú bez chýb.
- **Produkčný Build (`next build --webpack`):** `✅ PASSED`. Kvôli obmedzeniam sieťových socketov v lokálnom sandboxe bol prekonfigurovaný build na Webpack kompiláciu (prepínač `--webpack`), čím sa obišiel Turbopack sandbox crash.
- **Port Servera:** Štandardne zmenený z `3000`/`3002` na **`3322`** v `package.json`, `scripts/dev-all.sh`, a `lib/security/envValidation.ts`.

### 2. Automatizované Testy
- **Master Integrity Test (`scripts/test-integrity-suite.mjs`):** `✅ PASSED`. Všetkých **60/60 integrity assertions** prebehlo úspešne a overilo základnú programovú štruktúru 11 kritických súborov.
- **Security Audit (`scripts/test-security.mjs`):** `✅ PASSED`. Overená sila API kľúčov, rate limiting, HSTS a regexy na obranu pred XSS/SQLi.
- **Integrácia Live Testov (Files, Sysinfo, PWA, Tailscale):** `⚠️ NEUPLNÁ (SANDBOX LIMIT)`. Skripty v `scripts/` sú síce správne upravené na port `3322`, no ich sieťová časť zlyháva so statusom `EPERM` priamo v našom CLI kvôli sandboxovej reštrikcii pre socketové volania na localhost (`connect EPERM 127.0.0.1:3322`). 
- **Verifikácia v Prehliadači:** `✅ OVERENÁ`. Browser subagent potvrdil, že adresa `http://localhost:3322` je aktívna a reaguje na zadanie PIN kódu `0000` úspešným prihlásením do prostredia.

---

## 📋 Kompletný Zoznam Funkcií Aplikácie

1. **Authentication Guard (Face ID / PIN Passcode)**
   - Vynucuje prihlásenie pred sprístupnením workspace.
   - Poskytuje číselnú klávesnicu pre zadanie PIN (predvolený: `0000`).
   - Pokúša sa spustiť biometrické overenie cez WebAuthn API (`navigator.credentials.get`).
   - Premium lock/logout mechanizmus v pravom hornom rohu rozhrania.

2. **AI Chat Assistant (Oblasť Chatu)**
   - Interaktívny čet s AI modelom (štandardne Mistral) využívajúci server-sent events (SSE) na plynulé streamovanie odpovedí.
   - Podporuje spúšťanie odporúčaných príkazov priamo z četového rozhrania (ak príkaz začína znakom `$` alebo `/`).
   - Dynamic Island offset a animácie prispôsobené pre zobrazenie na iPhone (PWA režim).

3. **Interaktívny Hacking & OSINT Terminál**
   - Emulácia xterm.js terminálu v prehliadači napojená na backend proxy `/api/shell`.
   - Vytvára relácie terminálu na vzdialenom serveri (využíva `node-pty` alebo `/bin/bash` fallback).
   - Umožňuje spúšťať sieťové a penetračné nástroje ako `nmap`, `whois`, `dig`, `nikto`, `gobuster` prostredníctvom SSE streamu.

4. **File Explorer (Správca Súborov)**
   - Kompletná správa súborov a priečinkov v reálnom čase (CRUD operácie).
   - Bezpečnostný mechanizmus `getSafePath` zamedzujúci Directory Traversal útokom (obmedzené na `/Users/erikbabcan`).
   - Prehliadač a editor textových/kódových súborov a base64 inline vizualizácia obrázkov.

5. **System Monitor (Systémové Prostriedky)**
   - Monitorovanie výkonu servera v reálnom čase.
   - Vizualizácia percenta vyťaženia CPU a RAM prostredníctvom kruhových grafov.
   - Telemetrické dáta pre batériu (stav nabíjania, percento) a voľné miesto na disku.
   - Zoznam top 10 najnáročnejších bežiacich procesov na hostiteľskom stroji.

6. **Insolvency Monitor (Prediktívny cashflow monitoring úpadku)**
   - Finančný monitorovací panel analyzujúci platobnú morálku zmluvných partnerov (napr. GOLD TAXI s.r.o.).
   - Predpovedá insolvenciu 3 mesiace vopred na základe priemernej doby omeškania faktúr a neuhradeného salda.
   - Line chart (Recharts) porovnávajúci historickú platobnú morálku a bodkovanú predikčnú krivku na ďalšie 3 mesiace.
   - Hranica 45 dní nastavená ako kritická úroveň ("Insolvency Threshold").
   - Interaktívny simulátor ("What-If Analysis") s posuvníkmi pre dĺžku omeškania a výšku pohľadávky, ktorý v reálnom čase prepočítava skóre úpadku.

7. **Pandora Project Creator Stub**
   - Endpoint `/api/pandora/projects/create` pre overovanie klientskych briefov.
   - Ak je nastavené `PANDORA_UPSTREAM_URL`, preposiela požiadavky na reálny backend. Inak vracia syntetizovaný mock o úspešnom spracovaní (Phase 1 Stub).

---

## 🔍 Čo Aplikácii Presne Chýba / Je Mockované (Unpleasantly Precise)

> [!CAUTION]
> **1. Mockovaná Biometrická Verifikácia (Závažné):** 
> Endpoint `/api/auth/verify` je čistý stub. Vždy vracia úspešný jwt-mock token bez akéhokoľvek kryptografického overovania podpisu (signature validation) voči klientskemu verejnému kľúču.
> 
> **2. Nulová Perzistencia Čatu (Stredné):** 
> História četových správ je uložená iba v lokálnom React stave (`useState`). Akékoľvek zamknutie aplikácie (LOCK) alebo reload prehliadača kompletne vymaže celú konverzáciu.
> 
> **3. Mockovaný Predikčný Algoritmus (Stredné):** 
> 3-mesačná predikcia insolvencie v `insolvency-monitor.tsx` nepoužíva reálny ML model ani štatistickú regresiu. Ide o jednoduchý klientsky vzorec spájajúci posuvníky s váhami: `(SimulatedDelay / 30 * 35) + (SimulatedOutstanding / 15000 * 30) + (MoralityPenalty * 35)`.
> 
> **4. Pevne Zadrôtovaný Koreňový Priečinok (Stredné):** 
> V súbore `lib/security/fileUtils.ts` je pevne zakódovaná cesta `/Users/erikbabcan`. Súborový prieskumník zlyhá na akomkoľvek inom systéme alebo prostredí, kde tento používateľ neexistuje.
> 
> **5. Závislosti na Lokálnych CLI Nástrojoch (Nízke):** 
> Terminál a nástroje vyžadujú, aby boli `nikto`, `gobuster`, `nmap` atď. fyzicky nainštalované v systéme. V opačnom prípade terminálové príkazy končia chybou 'command not found'. Navyše, System info endpoint `/sysinfo` pre zoznam procesov a batériu predpokladá výhradne macOS platformu (`pmset` a `ps`).

---

## 💡 5 Promptov pre Vylepšenie Aplikácie (Prompty pre AI)

Odporúčané prompty pre ďalšie iterácie a vylepšenia systému Nexify Terminal:

```markdown
1. "Implementuj bezpečné kryptografické overovanie WebAuthn podpisov v /api/auth/verify s využitím overenej knižnice (napr. @simplewebauthn/server), aby sa nahradil súčasný mockovaný session token."
```

```markdown
2. "Pridaj lokálnu databázovú perzistenciu (napr. SQLite s Prisma, prípadne Firestore) pre ukladanie histórie četových konverzácií a nastavení vybraného AI modelu tak, aby sa história nevymazala po reštarte alebo uzamknutí rozhrania."
```

```markdown
3. "Refaktoruj /api/files a lib/security/fileUtils.ts tak, aby sa povolený koreňový adresár (ALLOWED_ROOT) načítaval dynamicky pomocou `os.homedir()` s fallbackom na aktuálny pracovný adresár v prípade chýbajúcich oprávnení."
```

```markdown
4. "Prepoj /api/insolvency s reálnou databázou pohľadávok alebo externým ekonomickým API (napr. Finstat, Odoo REST API) a implementuj reálny výpočet platobného indexu namiesto statických mock dát."
```

```markdown
5. "Nahraď jednoduchý klientsky What-if vzorec pre výpočet insolvencie pokročilou predikčnou analýzou na serveri. Vytvor Python/Node skript, ktorý vytrénuje základný logistický regresný model nad historickými faktúrami a poskytne skutočnú pravdepodobnosť zlyhania partnera 3 mesiace vopred."
```

---

## 🛠️ Návod na Spustenie a Verifikáciu (Pre AI a Ľudí)

### Spustenie lokálneho stacku
```bash
# Spustenie kompletného vývojového prostredia (Next.js + AI proxy + Hacking API)
bash scripts/dev-all.sh
```

### Spustenie testovacej a zostavovacej pipeline
```bash
# Spustenie 60 integrity testov, bezpečnostného auditu, typechecku a produkčného buildu naraz:
npm run prepare:prod
```

### Produkčné spustenie
```bash
# Spustenie produkčného servera na porte 3322
npm run start
```
