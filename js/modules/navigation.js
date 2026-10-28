// ============================================================
// BACK NAVIGATION GESTURE & TOAST CONTROLLER
// Android back button interception, history stack, and exit confirmations.
// ============================================================

let toastTimeout = null;

/**
 * Displays a transient bottom toast notification.
 */
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

let lastBackPressTime = 0;

/**
 * Initializes browser history stack to handle back swipe/button gracefully:
 * Closes open modals/keypad first, or requires double-back to exit.
 */
function setupNavigationHistory() {
    try {
        // Always set up [root → app] stack unconditionally.
        // If we skip this on session restore (state already 'app'), the history has
        // only one entry — swipe-back gets handled by OS before popstate fires, so
        // the app closes immediately without showing the "swipe again" toast.
        window.history.replaceState({ page: 'root' }, '');
        window.history.pushState({ page: 'app' }, '');
    } catch (_) {}

    window.addEventListener('popstate', () => {
        const searchModal = document.getElementById('search-modal');
        const chartModal = document.getElementById('chart-modal');
        const isSearchModalOpen = searchModal && (searchModal.style.display === 'flex' || searchModal.getAttribute('aria-hidden') === 'false');
        const isChartModalOpen = chartModal && (chartModal.style.display === 'flex' || chartModal.getAttribute('aria-hidden') === 'false');
        const isKeypadOpen = document.body.classList.contains('has-keypad-open');
        const isInputActive = document.activeElement && document.activeElement.classList.contains('currency-input');

        const installModal = document.getElementById('install-modal');
        const isInstallModalOpen = installModal && (installModal.style.display === 'flex' || installModal.getAttribute('aria-hidden') === 'false');

        // Priority 1: If search modal is open, close it
        if (isSearchModalOpen) {
            closeModal();
            try { window.history.pushState({ page: 'app' }, ''); } catch (_) {}
            return;
        }

        // Priority 2: If install modal is open, close it
        if (isInstallModalOpen) {
            closeInstallModal();
            try { window.history.pushState({ page: 'app' }, ''); } catch (_) {}
            return;
        }

        // Priority 3: If chart modal is open, close it
        if (isChartModalOpen) {
            closeChartModal();
            try { window.history.pushState({ page: 'app' }, ''); } catch (_) {}
            return;
        }

        // Priority 4: If virtual keypad or input focus is active, close/blur it
        if (isKeypadOpen || isInputActive) {
            closeVirtualKeypad();
            if (isInputActive) {
                try { document.activeElement.blur(); } catch (_) {}
            }
            try { window.history.pushState({ page: 'app' }, ''); } catch (_) {}
            return;
        }

        // Priority 5: Double back to exit from main app screen
        const now = Date.now();
        if (now - lastBackPressTime < 2000) {
            // Second back gesture within 2 seconds: actually exit.
            // We are already inside a popstate handler (browser already went back),
            // so do NOT call history.back() again — just reset the timer and let the
            // browser handle the navigation naturally (close PWA / go to home screen).
            lastBackPressTime = 0;
        } else {
            lastBackPressTime = now;
            const t = (typeof i18n !== 'undefined' && i18n[state.lang]) ? i18n[state.lang] : i18n['ru'];
            showToast(t.backToExit || 'Проведите назад ещё раз для выхода');
            triggerHaptic(10);
            // Re-push 'app' state so there is always a forward entry to intercept the next back gesture
            window.history.pushState({ page: 'app' }, '');
        }
    });
}
