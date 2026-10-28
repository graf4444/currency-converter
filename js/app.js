// ============================================================
// MAIN APPLICATION ENTRY POINT & BOOTSTRAP
// Orchestrates modular subsystems, lifecycle hooks, and global event listeners.
// ============================================================

/**
 * Dismisses the animated splash screen with a smooth fade-out.
 */
function dismissSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;

    // Skip immediately on pull-to-refresh or page reload
    if (typeof shouldSkipSplashScreen === 'function' && shouldSkipSplashScreen()) {
        try { splash.remove(); } catch (_) { splash.style.display = 'none'; }
        const crit = document.getElementById('splash-critical-css');
        if (crit) crit.remove();
        return;
    }

    // Mark as shown for this app session
    try { sessionStorage.setItem('pwa_splash_shown', 'true'); } catch (_) {}

    const startTime = window.__splashStartTime || Date.now();
    const elapsed = Date.now() - startTime;
    // Keep visible for ~1600ms so the user can enjoy the smooth roll and glow on fresh launch
    const delay = Math.max(0, 1600 - elapsed);

    setTimeout(() => {
        splash.classList.add('splash-fade-out');
        const cleanup = () => {
            try { splash.remove(); } catch (_) { splash.style.display = 'none'; }
            const crit = document.getElementById('splash-critical-css');
            if (crit) crit.remove();
        };
        splash.addEventListener('transitionend', cleanup, { once: true });
        setTimeout(cleanup, 500);
    }, delay);
}

// ============================================================
// GLOBAL WINDOW EVENT LISTENERS
// ============================================================

// Modal backdrop click handler
window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('search-modal')) closeModal();
    if (e.target === document.getElementById('chart-modal')) closeChartModal();
    if (e.target === document.getElementById('install-modal')) closeInstallModal();
});

// Escape key and physical keyboard routing
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('search-modal');
        if (modal && modal.style.display === 'flex') closeModal();
        const chartModal = document.getElementById('chart-modal');
        if (chartModal && chartModal.style.display === 'flex') closeChartModal();
        const installModal = document.getElementById('install-modal');
        if (installModal && installModal.style.display === 'flex') closeInstallModal();
        if (document.body.classList.contains('has-keypad-open')) closeVirtualKeypad();
        return;
    }

    // Route physical keyboard presses to virtual calculator when keypad is open
    if (document.body.classList.contains('has-keypad-open')) {
        const searchModal = document.getElementById('search-modal');
        if (searchModal && searchModal.style.display === 'flex') return;

        const key = e.key;
        if (/^[0-9\+\-\*\/\(\)\.]$/.test(key)) {
            e.preventDefault();
            handleKeypadPress(key);
        } else if (key === 'Backspace') {
            e.preventDefault();
            handleKeypadPress('BACKSPACE');
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            handleKeypadPress('=');
        } else if (key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleKeypadPress('C');
        }
    }
});

// Network status listeners
window.addEventListener('online', () => updateRates(false));
window.addEventListener('offline', () => updateOnlineStatusUI(false));

// Mobile app focus / visibility safety guards
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Prevent Android soft keyboard resurrection on app restore
        if (document.activeElement && document.activeElement.classList.contains('currency-input')) {
            document.activeElement.blur();
        }
        updateRates(false);
    }
});

window.addEventListener('focus', () => {
    // Extra safety against mobile soft keyboard on app switch
    if (document.activeElement && document.activeElement.classList.contains('currency-input')) {
        document.activeElement.blur();
    }
});

// ============================================================
// APPLICATION INITIALIZATION SEQUENCE
// ============================================================

initSystemSettings();
applyLocalization();
applyTheme();
updatePWAManifest();
setupUIEvents();
setupKeypadEvents();
setupChartEvents();
setupManageListEvents();
setupDragAndDropHandlers();
setupNavigationHistory();
setupPWAInstall();

// Instant initial render from cache
renderMain();
dismissSplashScreen();

// Check if page was explicitly reloaded by user (Cmd+R / F5 / browser reload / pull-to-refresh)
const isReload = isPageReload();

// Fetch live rates update:
// - If user manually reloaded the page (isReload === true): force update from network
// - If normal app open / cold start (isReload === false): use 1-hour cache and only fetch if expired
updateRates(isReload);

// Periodic background check every minute to refresh rates if 1-hour cache TTL expires while app is open
setInterval(() => {
    if (document.visibilityState === 'visible') {
        updateRates(false);
    }
}, 60 * 1000);
