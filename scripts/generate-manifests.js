const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFESTS_DIR = path.join(ROOT_DIR, 'manifests');

if (!fs.existsSync(MANIFESTS_DIR)) {
    fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
}

// Language definitions and localized titles
const manifestsData = {
    en: { name: "Currency Converter", short_name: "Converter", desc: "Fast, lightweight multi-currency converter PWA" },
    ru: { name: "Конвертер валют", short_name: "Конвертер", desc: "Быстрый и удобный конвертер валют PWA" },
    es: { name: "Conversor de Monedas", short_name: "Conversor", desc: "Conversor de monedas rápido y ligero PWA" },
    fr: { name: "Convertisseur de Devises", short_name: "Convertisseur", desc: "Convertisseur de devises rapide PWA" },
    de: { name: "Währungsrechner", short_name: "Rechner", desc: "Schneller und leichter Währungsrechner PWA" },
    it: { name: "Convertitore di Valuta", short_name: "Convertitore", desc: "Convertitore di valuta rapido PWA" },
    pt: { name: "Conversor de Moedas", short_name: "Conversor", desc: "Conversor de moedas rápido PWA" },
    tr: { name: "Döviz Çevirici", short_name: "Çevirici", desc: "Hızlı ve kullanışlı döviz çevirici PWA" },
    zh: { name: "货币兑换换算", short_name: "货币换算", desc: "快速轻量的实时货币换算工具 PWA" },
    ja: { name: "通貨換算ツール", short_name: "通貨換算", desc: "高速で使いやすい通貨換算ツール PWA" },
    ko: { name: "환율 계산기", short_name: "환율계산기", desc: "빠르고 가벼운 환율 계산기 PWA" },
    hi: { name: "मुद्रा परिवर्तक", short_name: "परिवर्तक", desc: "त्वरित और सरल मुद्रा परिवर्तक PWA" },
    ar: { name: "محول العملات", short_name: "محول", desc: "محول عملات سريع وخفيف PWA" }
};

function createManifest(lang, isRoot = false) {
    const data = manifestsData[lang] || manifestsData.en;
    const prefix = isRoot ? "./" : "../";

    return {
        id: "/currency-converter/",
        name: data.name,
        short_name: data.short_name,
        description: data.desc,
        lang: lang,
        dir: lang === 'ar' ? 'rtl' : 'ltr',
        start_url: `${prefix}index.html`,
        scope: prefix,
        display: "standalone",
        orientation: "portrait",
        theme_color: "#1c1c1e",
        background_color: "#000000",
        icons: [
            {
                src: `${prefix}icons/android-chrome-192x192.png`,
                sizes: "192x192",
                type: "image/png"
            },
            {
                src: `${prefix}icons/android-chrome-512x512.png`,
                sizes: "512x512",
                type: "image/png"
            },
            {
                src: `${prefix}icons/android-chrome-512x512.png`,
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable"
            }
        ]
    };
}

// 1. Generate root default manifest.json (English / default fallback)
fs.writeFileSync(
    path.join(ROOT_DIR, 'manifest.json'),
    JSON.stringify(createManifest('en', true), null, 2) + '\n',
    'utf8'
);
console.log('✓ Created manifest.json');

// 2. Generate manifests for all 13 languages in manifests/<lang>.json
for (const lang of Object.keys(manifestsData)) {
    fs.writeFileSync(
        path.join(MANIFESTS_DIR, `${lang}.json`),
        JSON.stringify(createManifest(lang, false), null, 2) + '\n',
        'utf8'
    );
    console.log(`✓ Created manifests/${lang}.json`);
}

console.log('✨ All manifests generated successfully.');
