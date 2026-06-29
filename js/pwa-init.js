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

let _currentManifestURL = null;

// Generates and injects (or replaces) the web app manifest.
// `opts` is optional and lets app.js pass live state on language/theme change.
function updatePWAManifest(opts) {
    const prefs = opts || (typeof state !== 'undefined'
        ? { lang: state.lang, theme: state.theme }
        : _pwaResolveInitialPrefs());

    const t = (typeof i18n !== 'undefined' && i18n[prefs.lang]) ? i18n[prefs.lang] : i18n.en;
    const appName = t.title;
    const themeColor = prefs.theme === 'dark' ? '#1c1c1e' : '#ffffff';
    const bgColor = prefs.theme === 'dark' ? '#000000' : '#f5f5f7';

    const manifestObj = {
        // `id` must stay stable across deploys; do NOT localize it.
        id: '/currency-converter/',
        name: appName,
        short_name: appName,
        description: appName,
        lang: prefs.lang,
        dir: prefs.lang === 'ar' ? 'rtl' : 'ltr',
        start_url: new URL('./index.html', window.location.href).href,
        scope: new URL('./', window.location.href).href,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: themeColor,
        background_color: bgColor,
        icons: [
            {
                src: "./icons/android-chrome-192x192.png",
                sizes: "192x192",
                type: "image/png"
            },
            {
                src: "./icons/android-chrome-512x512.png",
                sizes: "512x512",
                type: "image/png"
            },
            {
                src: "./icons/android-chrome-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable"
            }
        ]
    };

    const blob = new Blob([JSON.stringify(manifestObj)], { type: 'application/manifest+json' });
    const url = URL.createObjectURL(blob);

    let link = document.getElementById('dynamic-manifest');
    if (!link) {
        link = document.createElement('link');
        link.id = 'dynamic-manifest';
        link.rel = 'manifest';
        document.head.appendChild(link);
    }
    // Release the previous blob URL to avoid memory leaks on repeated updates.
    if (_currentManifestURL) URL.revokeObjectURL(_currentManifestURL);
    _currentManifestURL = url;
    link.href = url;

    // Keep <meta name="theme-color"> in sync with the active theme.
    const metaTheme = document.getElementById('meta-theme-color');
    if (metaTheme) metaTheme.setAttribute('content', themeColor);
}

// Inject the localized manifest IMMEDIATELY (before app.js runs and before
// any install prompt). Requires DOM <head>, which exists at this point
// because the <script> tag lives inside <head>.
updatePWAManifest();

// Register the service worker after the page has loaded so it never
// competes with first paint.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('Service Worker registered', reg.scope))
            .catch((err) => console.error('SW registration failed', err));
    });
}
