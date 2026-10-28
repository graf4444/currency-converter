// ============================================================
// PWA bootstrap. Runs BEFORE app.js so the localized manifest is
// in place before the browser fires `beforeinstallprompt`.
// The install dialog (app name, short_name, description) will
// then appear in the user's chosen language.
// ============================================================

// Resolve initial language/theme without depending on app.js.
function _pwaResolveInitialPrefs() {
    let lang = 'en';
    let theme = 'dark';
    try {
        const saved = localStorage.getItem('conv_max_state');
        if (saved) {
            const s = JSON.parse(saved);
            if (s && typeof s.lang === 'string' && i18n[s.lang]) lang = s.lang;
            if (s && (s.theme === 'dark' || s.theme === 'light')) theme = s.theme;
            return { lang, theme };
        }
    } catch (_) { /* corrupted storage — fall through to system defaults */ }

    const sysLang = (navigator.language || navigator.userLanguage || 'en').split('-')[0].toLowerCase();
    if (i18n[sysLang]) lang = sysLang;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) theme = 'light';
    return { lang, theme };
}

// Switches the web app manifest to the user's localized static manifest file.
// `opts` is optional and lets app.js pass live state on language/theme change.
function updatePWAManifest(opts) {
    const prefs = opts || (typeof state !== 'undefined'
        ? { lang: state.lang, theme: state.theme }
        : _pwaResolveInitialPrefs());

    const lang = (prefs && prefs.lang && typeof i18n !== 'undefined' && i18n[prefs.lang]) ? prefs.lang : 'en';
    const themeColor = (prefs && prefs.theme === 'light') ? '#ffffff' : '#1c1c1e';

    let link = document.getElementById('app-manifest') || document.getElementById('dynamic-manifest');
    if (!link) {
        link = document.createElement('link');
        link.id = 'app-manifest';
        link.rel = 'manifest';
        document.head.appendChild(link);
    }
    
    // Use real static HTTPS manifest file for 100% compatibility with Android WebAPK generator
    link.href = `./manifests/${lang}.json`;

    // Keep <meta name="theme-color"> in sync with the active theme.
    const metaTheme = document.getElementById('meta-theme-color');
    if (metaTheme) metaTheme.setAttribute('content', themeColor);
}

// Inject the localized manifest IMMEDIATELY (before app.js runs and before
// any install prompt). Requires DOM <head>, which exists at this point
// because the <script> tag lives inside <head>.
updatePWAManifest();

// Capture the install prompt as early as possible so it is never lost
// before app.js loads and calls setupPWAInstall().
window.__deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__deferredInstallPrompt = e;
});

// Register the service worker after the page has loaded so it never
// competes with first paint.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('Service Worker registered', reg.scope))
            .catch((err) => console.error('SW registration failed', err));
    });
}
