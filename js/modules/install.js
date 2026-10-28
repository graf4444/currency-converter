// ============================================================
// PWA INSTALLATION CONTROLLER
// Install prompts, custom instructions modal, and platform detection.
// ============================================================

let deferredInstallPrompt = null;

function isRunningStandalone() {
    return (
        (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: window-controls-overlay)').matches)) ||
        (window.navigator && window.navigator.standalone === true) ||
        (document.referrer && document.referrer.includes('android-app://'))
    );
}

function updateInstallButtonVisibility() {
    const isStandalone = isRunningStandalone();
    const btnFooter = document.getElementById('ui-footer-install-btn');

    if (btnFooter) {
        btnFooter.style.display = isStandalone ? 'none' : 'inline-flex';
    }
}

async function handleInstallClick() {
    triggerHaptic(12);
    if (deferredInstallPrompt) {
        try {
            deferredInstallPrompt.prompt();
            const choiceResult = await deferredInstallPrompt.userChoice;
            if (choiceResult && choiceResult.outcome === 'accepted') {
                deferredInstallPrompt = null;
                updateInstallButtonVisibility();
                const t = (typeof i18n !== 'undefined' && i18n[state.lang]) ? i18n[state.lang] : i18n.en;
                showToast(t.installSuccess || 'Application installed successfully!');
            }
        } catch (_) {
            openInstallModal();
        }
    } else {
        openInstallModal();
    }
}

function openInstallModal() {
    triggerHaptic(10);
    const modal = document.getElementById('install-modal');
    if (!modal) return;

    renderInstallSteps();
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
}

function closeInstallModal() {
    triggerHaptic(8);
    const modal = document.getElementById('install-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
}

function renderInstallSteps() {
    const stepsContainer = document.getElementById('install-steps-list');
    if (!stepsContainer) return;

    const t = (typeof i18n !== 'undefined' && i18n[state.lang]) ? i18n[state.lang] : i18n.en;
    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/i.test(ua);

    let html = '';

    if (deferredInstallPrompt) {
        // Native install prompt is available — tell user to tap the button
        html = `
            <div class="install-step-item">
                <div class="install-step-badge">✓</div>
                <div>${t.installReadyDesc || 'Tap the button below to install the app on your device'}</div>
            </div>
        `;
    } else if (isIos) {
        html = `
            <div class="install-step-item">
                <div class="install-step-badge">1</div>
                <div>${t.installIosStep1 || 'Tap the Share button at the bottom of Safari'}</div>
            </div>
            <div class="install-step-item">
                <div class="install-step-badge">2</div>
                <div>${t.installIosStep2 || 'Scroll and select "Add to Home Screen"'}</div>
            </div>
        `;
    } else if (isAndroid) {
        html = `
            <div class="install-step-item">
                <div class="install-step-badge">1</div>
                <div>${t.installAndroidStep || 'Tap the ⋮ menu in your browser and select "Add to Home Screen" or "Install App"'}</div>
            </div>
        `;
    } else {
        html = `
            <div class="install-step-item">
                <div class="install-step-badge">1</div>
                <div>${t.installDesktopStep || 'Click the install icon in the address bar or browser menu'}</div>
            </div>
        `;
    }
    stepsContainer.innerHTML = html;

    const actionBtn = document.getElementById('ui-install-action-btn');
    if (actionBtn) {
        if (deferredInstallPrompt) {
            actionBtn.textContent = t.install || 'Install';
        } else {
            actionBtn.textContent = t.installGotIt || 'Got it';
        }
    }
}

/**
 * Sets up PWA installation listeners and connects footer install controls.
 */
function setupPWAInstall() {
    // Pick up any prompt captured early by pwa-init.js (avoids race condition)
    if (window.__deferredInstallPrompt) {
        deferredInstallPrompt = window.__deferredInstallPrompt;
        window.__deferredInstallPrompt = null;
        updateInstallButtonVisibility();
        renderInstallSteps();
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        window.__deferredInstallPrompt = null;
        updateInstallButtonVisibility();
        renderInstallSteps();
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        closeInstallModal();
        updateInstallButtonVisibility();
        const t = (typeof i18n !== 'undefined' && i18n[state.lang]) ? i18n[state.lang] : i18n.en;
        showToast(t.installSuccess || 'Application installed successfully!');
    });

    const btnFooter = document.getElementById('ui-footer-install-btn');
    if (btnFooter) btnFooter.addEventListener('click', handleInstallClick);

    const closeBtn = document.getElementById('ui-install-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeInstallModal);

    const actionBtn = document.getElementById('ui-install-action-btn');
    if (actionBtn) {
        actionBtn.addEventListener('click', () => {
            if (deferredInstallPrompt) {
                closeInstallModal();
                handleInstallClick();
            } else {
                closeInstallModal();
            }
        });
    }

    updateInstallButtonVisibility();
}
