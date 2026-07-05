# Nexify Terminal 🚀

Nexify Terminal je špičkové, vysoko zabezpečené webové a PWA rozhranie optimalizované pre iPhone 17 Air (iOS 18+), ktoré slúži ako interaktívny ovládací pult pre tvoj Mac.

---

## 📱 Kľúčové vlastnosti

1. **Interaktívny Chat a PTY Terminál**:
   - Bezproblémové prepínanie medzi chatom a plnohodnotným terminálom pomocou `xterm.js`.
   - Zdieľaný stav relácie (PTY) – príkazy spustené v chate okamžite ovplyvňujú terminál a naopak.

2. **Vizuálny File Explorer**:
   - Prehliadanie adresárov, bezpečné čítanie/zápis súborov a integrovaný editor s číslovaním riadkov.
   - Detekcia obrázkov a ich priame zobrazovanie v okne náhľadu (Base64 render).
   - Zabezpečenie proti Directory Traversal útokom (`/Users/erikbabcan` root filter).

3. **Systémový Monitor v reálnom čase**:
   - Vizualizácia zaťaženia CPU, RAM, kapacity disku a stavu batérie cez SVG kruhové meradlá.
   - Dynamický graf histórie záťaže pomocou reaktívnych grafov `Recharts`.
   - Prehľadná tabuľka TOP 10 spustených procesov zoradených podľa vyťaženia CPU.
   - **Energetická optimalizácia**: Keď úroveň batérie klesne pod 20 % (Low Power Mode), frekvencia telemetry dopytovania sa automaticky zníži z 2s na 10s pre šetrenie energie.

---

## ⚡ Optimalizácia pre iPhone 17 Air (iOS 18+ & PWA)

*   **Zobrazenie na celú obrazovku**: Bez adresného riadku Safari (`standalone` režim), s čiernou translucentnou stavovou lištou.
*   **Ergonomický Lockscreen (Face ID + PIN)**:
    - Biometrické prihlásenie cez hardvérové kľúče (Face ID/Touch ID) pomocou WebAuthn rozhrania.
    - Záložný dotykový číselník so zabezpečeným PIN kódom: **`2366`**.
    - Celé rozhranie lockscreenu a klávesnice bolo zväčšené o **15 %** pre pohodlnejšie zadávanie prstami.
*   **iOS Audio-Haptický Engine**:
    - Syntetická odozva (vibrácie) generovaná pomocou Web Audio API na frekvencii 60Hz pre simuláciu mechanického kliknutia cez reproduktor telefónu.
*   **Swipe Gestá**: Plynulé prepínanie záložiek potiahnutím prsta (swipe) doľava/doprava: `Chat ↔ Terminal ↔ Files ↔ System`.
*   **Blokovanie priblíženia**: Globálne zabránenie zoomovaniu (pinch-to-zoom a double-tap-zoom) pre natívny dojem z používania.
*   **Odsadenie Safe Area (Viewport-Fit)**:
    - Horná lišta je posunutá o `safe-area-inset-top` (pod Dynamic Island).
    - Spodná lišta má pridaný buffer `pb-[calc(env(safe-area-inset-bottom,0px)+12px)]`, čím dokonale obchádza spodný Home indikátor a zabraňuje akémukoľvek orezaniu chatu.
*   **120 FPS WebGL animácia pozadia**:
    - Optimalizovaná časticová sféra pomocou `THREE.InstancedMesh` (zníženie draw-callov z 800 na 1).
    - Vyladené prepočty rotácie mimo vykresľovacej slučky (len 2 goniometrické prepočty na snímku namiesto 1000).
    - Použitie lacného `MeshBasicMaterial` na elimináciu fragment shader výpočtov osvetlenia.
    - Cielenie DPR na hodnotu `1.5` a zakázaný `antialias` pre maximálnu úsporu batérie.

---

## 🛡️ Sieťová bezpečnosť (Tailscale Lockdown)

Aplikácia implementuje prísny sieťový filter (Middleware) na overenie prichádzajúcej IP adresy:
- Povolený je prístup len z lokálneho Macu (`127.0.0.1`, `::1`) a z autorizovaného iPhonu cez Tailscale VPN (`100.103.153.97`).
- Ostatné zariadenia (aj v lokálnej domácej sieti Wi-Fi) sú okamžite zablokované s odpoveďou **`403 Forbidden`**.
- Filter automaticky očisťuje IPv6-mapped IPv4 prefixy (`::ffff:`), čím zabraňuje nežiaducemu zablokovaniu autorizovaného iPhonu.

---

## ⚙️ Spustenie projektu

Pre ručné spustenie celého stacku (Next.js UI na porte 3322, Hacking API na porte 3021, AI Proxy na porte 8788):

```bash
cd "/Users/erikbabcan/aaa-terminalnexify2-with-v-main" && pnpm dev:all
```

---

## 🔄 Automatické spúšťanie na pozadí (Launch Agent)

Pre automatické spúšťanie po štarte Macu bol vytvorený Launch Agent:
📄 `/Users/erikbabcan/Library/LaunchAgents/com.nexify.terminal.plist`

*   **Aktivácia (spustenie na pozadí)**:
    ```bash
    launchctl load ~/Library/LaunchAgents/com.nexify.terminal.plist
    ```
*   **Deaktivácia**:
    ```bash
    launchctl unload ~/Library/LaunchAgents/com.nexify.terminal.plist
    ```
*   **Záznamy o behu (Logy)**:
    - Štandardný výstup: `tail -f /Users/erikbabcan/aaa-terminalnexify2-with-v-main/launchd-out.log`
    - Chyby: `tail -f /Users/erikbabcan/aaa-terminalnexify2-with-v-main/launchd-err.log`
