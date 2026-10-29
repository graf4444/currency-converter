# 📜 Changelog / Release History

All notable changes to the **Currency & Cryptocurrency Converter** project are documented in this file.  
The project adheres to [Semantic Versioning (SemVer)](https://semver.org/).

> 🇷🇺 **Ищете описание на русском языке?** См. [CHANGELOG.ru.md](CHANGELOG.ru.md).

---

## 📑 Table of Contents

- [v1.21.0 (2026-10-29) — Major Release: App Shortcuts, Smart Clipboard, Share Breakdown & Privacy](#v1210-2026-10-29)
- [v1.20.0 (2026-10-28) — Synchronous Header Slide & Active Input Viewport](#v1200-2026-10-28)
- [v1.19.0 (2026-10-28) — Sticky Header Pinning & Active Row Tracking](#v1190-2026-10-28)
- [v1.18.0 – v1.15.0 — Keypad Transform Fixes & UI Polishing](#v1180--v1150)
- [v1.14.0 (2026-10-28) — ES6 Modular Architecture](#v1140-2026-10-28)
- [v1.13.0 – v1.9.0 — Custom Keypad, Splash Screen & Themes](#v1130--v190)
- [v1.6.0 (2026-10-25) — PWA Installation Modal & Private Analytics](#v160-2026-10-25)
- [v1.0.0 (2026-10-21) — Initial Stable Release](#v100-2026-10-21)

---

## [v1.21.0] — 2026-10-29

This release consolidates major usability enhancements, deep mobile OS integration, clipboard automation, privacy safeguards, and calculation precision improvements.

### ⚡ 1. PWA Quick Actions & App Shortcuts
Native-grade integration with mobile and desktop operating systems:
- **Home Screen & Taskbar Shortcuts:** Long-pressing the app icon on Android (WebAPK) or right-clicking on desktop (Windows, macOS) reveals a system quick-actions menu.
- **Popular Currency Pairs & Quick Tools:**
  - `USD → EUR` — instant conversion from US Dollars to Euros;
  - `EUR → USD` — instant conversion from Euros to US Dollars;
  - `USD → RUB` — instant conversion from US Dollars to Russian Rubles;
  - `BTC → USD` — check real-time Bitcoin price;
  - 🧮 `Keypad` — instantly open the calculator keypad;
  - 🔍 `Search` — direct jump to currency search and management.
- **Clean URL Architecture:** Switched from messy hash fragments to clean URL query parameters, resolving the Android WebAPK `ERR_FAILED` redirect issue.
- **Dedicated Icons:** Custom SVG and high-resolution PNG icons for every shortcut action.
- **Comprehensive Localization:** Shortcut titles and descriptions are fully translated across all 13 supported languages (`manifests/*.json`).

---

### 🔒 2. Smart Express Mode & User Favorites Protection
Optimized experience when launching via external links or QR codes:
- **Focused Express Mode:** Opening deep links containing specific currency pairs (e.g. `?from=USD&to=EUR&amount=100`) switches the app into a focused Express Mode displaying only the two requested currencies, eliminating visual clutter.
- **Saved Favorites Protection:** Previously, launching deep links could overwrite user-curated favorite currencies in `localStorage`. The user's saved list is now isolated and protected against unwanted overwrites.
- **Seamless Return:** Tapping "Show All Currencies" or using the system "Back" gesture instantly restores the complete saved currency list.

---

### 📤 3. Share Calculation Breakdown
Share currency conversions with friends, colleagues, or clients in a single tap:
- **Quick Action Button:** Dedicated "Share" button placed right next to active input fields and on the virtual keypad header.
- **Styled Summary Output:** Generates a beautifully structured summary with emoji country flags, calculated rates, timestamp, and a direct interactive deep link:
  ```text
  💱 100 USD = 92.50 EUR
  📅 Rates as of 29.10.2026 19:20
  1 USD = 0.9250 EUR

  🔗 Open calculation:
  https://graf4444.github.io/currency-converter/?from=USD&to=EUR&amount=100
  ```
- **Native Web Share API:** Opens the native OS sharing sheet (Telegram, WhatsApp, Messages, Notes) on supported mobile devices. Falls back to clipboard copying with a toast notification on desktop browsers.
- **Dynamic Base URL:** Automatically infers the correct hosting base URL (`origin + pathname`) across custom domains or GitHub Pages.

---

### 📋 4. Smart Clipboard Paste & Auto-Detection
Instant detection of amounts and currencies copied outside the app:
- **Intelligent Detection Banner:** When opening or refocusing the app, it non-intrusively checks the clipboard for amounts or currency text and renders an animated pill banner at the top.
- **Deep Format Parsing:**
  - Currency symbols: `$`, `€`, `£`, `₽`, `¥`, `₺`, `₩`, `₿`, etc.;
  - ISO codes: `USD`, `EUR`, `RUB`, `KZT`, `BYN`, `UZS`, `USDT`, `BTC`, etc.;
  - Localized words and colloquial terms: `руб`, `долл`, `евро`, `bucks`, `bucks`, etc.;
  - Formatted numbers: spaces as thousands separators (`1 250 000`), commas and dots (`49,99` or `49.99`);
  - Currency Converter URLs: links shared by other users are immediately parsed into exact source and target currencies.
- **Interactive Banner Controls:** One-tap "Paste" button, close button (`✕`), visual countdown timer, and smooth CSS slide animations. The banner persists during scrolling and screen gestures, closing strictly upon timer expiration or explicit user choice ("Paste" or "Dismiss").

---

### 🛡️ 5. Clipboard Privacy Modal & Analytics Domain Lockdown
Uncompromising privacy and transparency standards:
- **Safety Transparency Modal:**
  - Information icon (`ℹ️`) next to the clipboard banner opens an informative modal guide explaining how clipboard access works.
  - Transparent assurance: clipboard processing occurs **100% locally in browser RAM**. Clipboard content is never transmitted to servers, never written to disk, and never logged to analytics.
  - Non-currency personal messages, passwords, and sensitive text are strictly ignored.
- **GoatCounter Analytics Isolation:**
  - Analytics scripts are strictly constrained to the official production domain (`graf4444.github.io`).
  - Development environments (`localhost`, `127.0.0.1`, file previews) do not trigger analytics requests, preserving clean production metrics.

---

### 💎 6. Cryptocurrency & Numerical Precision
- **Micro-Value Precision:** Enhanced fractional precision handling for cryptocurrencies with many decimal places (e.g. `0.000015 BTC`).
- **IEEE-754 Floating-Point Correction:** Eliminates JavaScript binary floating-point calculation artifacts (such as `...00000002`).

---

### 🏗️ 7. Build Automation & SemVer Standard
- **Semantic Versioning (`MAJOR.MINOR.PATCH`):** Full migration to the SemVer standard.
- **Automated Build Tool (`scripts/build.js`):**
  - `npm run bump:patch` (`1.20.1` → `1.20.2`) — incremental patches during dev;
  - `npm run bump:minor` (`1.20.x` → `1.21.0`) — feature releases;
  - `npm run bump:major` — major architecture revisions;
  - Synchronizes version numbers in `package.json`, `js/constants.js`, `index.html`, regenerates localized manifests for all 13 languages, and increments the Service Worker cache (`sw.js`).

---

## [v1.20.0] — 2026-10-28
- **UI:** Implemented synchronous header sliding alongside the currency list above the virtual keypad.
- **Layout:** Clamped active currency row within the visible viewport.

## [v1.19.0] — 2026-10-28
- **UI:** Pinned sticky header during scrolling and added viewport centering for active input rows.

## [v1.18.0] – [v1.15.0] — 2026-10-28
- **Keypad:** Fixed cumulative transform shifts upon repeated keypad toggling.
- **Keypad:** Clamped currency list position below the header.
- **UI:** Cleaned currency management button label and removed legacy `+` prefix.
- **UI:** Eliminated footer jumping during keypad close animations.

## [v1.14.0] — 2026-10-28
- **Refactoring:** Modularized the application into independent ES6 modules in `js/modules/` (`api.js`, `chart.js`, `converter.js`, `keypad.js`, `manage-list.js`, `navigation.js`, `state.js`, `ui.js`, `utils.js`).

## [v1.13.0] – [v1.9.0] — 2026-10-28
- **Keypad:** Smooth scroll-back animation when dismissing the keypad.
- **Keypad:** Eliminated layout flicker and enabled in-place input editing.
- **Splash Screen:** Startup splash animation runs only on initial app launch and skips on subsequent refreshes.
- **Themes:** Fixed light/dark theme switching and status bar synchronization.

## [v1.6.0] — 2026-10-25
- **PWA:** Added native-style installation prompt with step-by-step guidance for iOS Safari, Android Chrome, and Desktop.
- **Analytics:** Integrated privacy-friendly [GoatCounter](https://www.goatcounter.com) analytics (no cookies, zero personal data, 100% GDPR compliant).

## [v1.0.0] — 2026-10-21
- **Initial Release:**
  - Real-time conversion across dozens of fiat currencies and major cryptocurrencies (BTC, ETH, USDT);
  - Live recalculation of all currencies as you type;
  - Full offline support via Service Worker caching;
  - Fallback exchange rate providers (Frankfurter, Open Exchange Rates, CoinGecko);
  - 13 interface languages;
  - Interactive exchange rate historical charts (7d, 30d, 90d).
