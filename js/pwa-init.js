// Функция генерации и обновления PWA манифеста на лету
function updatePWAManifest() {
    const t = i18n[state.lang] || i18n['en'];
    const appName = t.title;

    const manifestObj = {
        "id": "/currency-converter/",
        "short_name": appName,
        "name": appName,
        "description": appName,
        "icons": [
            {
                "src": "https://cdn-icons-png.flaticon.com/512/13974/13974002.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any maskable"
            }
        ],
        "start_url": "./index.html",
        "display": "standalone",
        "theme_color": state.theme === 'dark' ? '#1c1c1e' : '#ffffff',
        "background_color": state.theme === 'dark' ? '#000000' : '#f5f5f7',
        "orientation": "portrait"
    };

    const manifestBlob = new Blob([JSON.stringify(manifestObj)], {type: 'application/json'});
    const manifestURL = URL.createObjectURL(manifestBlob);

    let manifestLink = document.getElementById('dynamic-manifest');
    if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.id = 'dynamic-manifest';
        manifestLink.rel = 'manifest';
        document.head.appendChild(manifestLink);
    }
    manifestLink.href = manifestURL;
}

updatePWAManifest();

// Регистрация Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker зарегистрирован', reg))
            .catch(err => console.error('Ошибка SW', err));
    });
}