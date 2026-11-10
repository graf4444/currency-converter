# 📜 Changelog / Release History

All notable changes to the **Currency & Cryptocurrency Converter** project are documented in this file.  
The project adheres to [Semantic Versioning (SemVer)](https://semver.org/).

> 🇷🇺 **Ищете описание на русском языке?** См. [CHANGELOG.ru.md](CHANGELOG.ru.md).

---

## 📑 Table of Contents

- [v1.24.0 (2026-11-10) — Touch Responsiveness, Zero-Delay Startup & In-Place DOM Sync](#v1240-2026-11-10)
- [v1.23.0 (2026-11-04) — Interactive Easter Eggs, Adaptive Rate Pills & UI Refinements](#v1230-2026-11-04)
- [v1.22.0 (2026-11-01) — Custom Exchange Rates, Mobile UI Fixes & Smooth Drag and Drop](#v1220-2026-11-01)
- [v1.21.0 (2026-10-29) — Major Release: App Shortcuts, Smart Clipboard, Share Breakdown & Privacy](#v1210-2026-10-29)
- [v1.20.0 (2026-10-28) — Synchronous Header Slide & Active Input Viewport](#v1200-2026-10-28)
- [v1.19.0 (2026-10-28) — Sticky Header Pinning & Active Row Tracking](#v1190-2026-10-28)
- [v1.18.0 – v1.15.0 — Keypad Transform Fixes & UI Polishing](#v1180--v1150)
- [v1.14.0 (2026-10-28) — ES6 Modular Architecture](#v1140-2026-10-28)
- [v1.13.0 – v1.9.0 — Custom Keypad, Splash Screen & Themes](#v1130--v190)
- [v1.6.0 (2026-10-25) — PWA Installation Modal & Private Analytics](#v160-2026-10-25)
- [v1.0.0 (2026-10-21) — Initial Stable Release](#v100-2026-10-21)

---

## [v1.24.0] — 2026-11-10

This production release resolves input locking and touch lag across virtual keypad controls, optimizes typing performance with debounced storage persistence, and eliminates visual flickering and delays during PWA application launch and background rate updates.

### ⚡ 1. Instant Touch Responsiveness & Tap Lockout Removal
- **Zero-Latency Interactions:** Removed the aggressive 420ms global lockout window (`lastCloseKeypadTime < 420` and `isClosingKeypad`) across currency cards, keypad re-opening, the "+ Add Currency" button, and clear actions. All touches and card switches now respond instantaneously without dropping first taps.
- **Fail-Safe Keypad Input Resolution:** Fixed a critical bug where clearing an input field caused `handleKeypadPress` to lose its target when native focus desynced. Implemented multi-stage active input fallback (`activeInputEl` → `currentEditingCode` → `currentInputCode` → `.active-input-card` → first available input), preventing unresponsive calculator buttons after clearing digits.
- **Pointerdown Whitelisting:** Whitelisted key action buttons (`#ui-add-btn`, `#ui-exit-quick-mode-btn`, `.smart-paste-banner`) from global outside-click dismissal, guaranteeing single-tap modal opening without dropped click events.

### 🚀 2. Debounced State Persistence & Stutter-Free Typing
- **Asynchronous Storage Sync:** Replaced blocking synchronous JSON serialization and `localStorage.setItem` on every keystroke with a high-performance `debouncedSaveState(250)`. Rapid digit entry and math operations remain buttery-smooth on mobile devices.
- **Guaranteed Durability:** Flushes queued state changes immediately on `visibilitychange` (hidden) and `pagehide` to ensure no user calculations are ever lost when switching apps or locking the device.

### 🖥️ 3. Flicker-Free PWA Launch & In-Place DOM Updates
- **In-Place Card Synchronization:** Introduced `updateCardsInPlace()`: background exchange rates updates smoothly refresh live rates, placeholders, and custom rate pills directly in the existing DOM without destroying cards (`container.innerHTML = ''`). Eliminates layout shift, screen flashes, and aborted gesture animations.
- **Critical Theme Head Script:** Added early inline script in `<head>` to evaluate and apply `data-theme` prior to stylesheet rendering, preventing light/dark theme flash (FOUC) when opening in standalone PWA mode.
- **Snappy Splash Exit:** Reduced artificial in-app splash screen delay from 1600ms down to 320ms, allowing immediate access to the converter without visual stutter.
- **Instant Online Status:** Decoupled `updateOnlineStatusUI()` from blocking network connectivity checks (`1.1.1.1` ping), using synchronous `navigator.onLine` for immediate UI feedback.

---

## [v1.23.0] — 2026-11-04

This release introduces an interactive suite of secret easter eggs and mini-games, dynamic custom exchange rate pill adaptation, smoother card physics during reordering, and full 13-language localization for all new interactive elements.

### 🕹️ 1. Interactive Easter Eggs & Hidden Secrets
Discover fun surprises and mini-games built directly into the converter and keypad:
- **`1337` (Matrix Mode):** Typing 1337 transforms the interface into a retro green phosphor terminal with falling digital matrix rain.
- **`777` (Jackpot Casino):** Hitting 777 spins casino slot reels and showers the screen with golden coin confetti.
- **`/ 0` (Zero Division Warning):** Dividing by zero triggers a playful high-tech emergency blast warning banner and screen vibration.
- **`80085` & `01134` (Keypad Fun):** Classic calculator tricks: giggling inputs and upside-down display greetings (`hELLO`).
- **Splash Roulette:** Double or triple-tapping the animated splash screen logo triggers an interactive slot roulette minigame.
- **Gold VIP AMOLED Edition:** Rapidly toggling themes unveils a hidden pitch-black AMOLED Gold VIP theme.
- **Device Shake Physics:** Shaking your smartphone triggers accelerometer-driven physics collapse of currency cards.
- **Moon Rocket:** Triple-tapping the Bitcoin (₿) symbol launches an animated pixel rocket with particle exhaust and victory confetti.
- **Full Localization & Haptics:** All easter egg messages and prompts are fully translated into all 13 supported languages with synchronized mobile vibration feedback (`navigator.vibrate`).

### 🏷️ 2. Adaptive Custom Rate Pills
- **Dynamic Width:** Custom exchange rate pills now automatically adjust their width to fit long currency names, custom tags, and multi-currency values gracefully.
- **Touch Refinements:** Improved tap sensitivity and accordion transition smoothness for quick custom rate variant switching.

### 🎴 3. Card Physics & Reordering Rest
- **Spring Repulsion Removal:** Eliminated distracting spring bounce artifacts during currency card drag-and-drop.
- **Stable Anchoring:** Smooth physics resting animation ensures cards land cleanly into their target positions without jitter.

---

## [v1.22.0] — 2026-11-01

This release brings custom exchange rate locking, mobile interface stabilization during keyboard input, and a completely re-engineered, rock-solid currency list reordering (Drag & Drop).

### 🏷️ 1. Custom Exchange Rates & Fixed Quotes
Set your own real-world exchange rates independent of interbank market rates:
- **Custom Exchange Rates:** Define custom buy or sell rates for specific banks, physical exchange booths, or P2P transfers with actual spreads and fees.
- **Two Flexible Formats:**
  - Direct exchange rate (e.g., `1 USD = 98.5 RUB`);
  - Multiplier / inverse rate (e.g., `1 RUB = 0.01015 USD`).
- **Quick Tags & Notes:** Add notes or select ready-to-use tag chips (`Bank`, `Exchange Booth`, `Vacation`, `Crypto`, `P2P`) to easily track where each rate came from.
- **Fast Currency Search:** Redesigned picker with instant search by code or name and country flags.
- **Variant Grouping:** In "Manage Currency List", multiple rates for the same currency neatly collapse under an accordion. Switch between market rates and your custom rates with one tap, or edit and remove them anytime.
- **Share Rates via URL:** Share calculations with custom rates via a direct link (`?custom=...`) — recipients will immediately see the exact conversion using your custom rate.

---

### 📱 2. Mobile Improvements & Keyboard Stabilization
- **Smooth Keyboard Opening:** Fixed an issue where opening the "Custom Rate" modal on smartphones and focusing an input caused the screen to jump, jerk, or redraw erratically.
- **Adaptive Card Layout:** Fine-tuned spacing, badges, and text wrapping so currency codes, names, and long numbers fit cleanly without clipping on small phone screens.

---

### ✋ 3. Smooth & Reliable Drag & Drop
- **Natural Grab Point:** Dragging now anchors directly to where your finger or cursor touched the card, rather than snapping awkwardly to the center.
- **Stable Reordering:** Completely resolved list flickering and jitter during drag operations. Cards move cleanly and predictably into position.
- **Touch-Friendly on Mobile:** Grabbing the `☰` handle no longer conflicts with page scrolling or system swipe gestures, while scrolling the list outside the handle remains smooth.
- **Polished Animations & Haptics:** Subtle slot highlight, a gentle spring settle effect on drop, and crisp tactile vibration feedback.

---

### 🌐 4. Complete Localization Across 13 Languages
- Audited and translated all new modal dialogues, buttons, tags, notes, and empty search states across all 13 supported languages.

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
