const fs = require('fs');
const path = require('path');
const { generateIcons } = require('./generate-shortcut-icons');

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

// PWA Quick Actions (App Shortcuts) localized data
const shortcutsData = {
    en: [
        {
            name: "USD → EUR",
            short_name: "USD → EUR",
            description: "Quick convert US Dollar to Euro",
            url: "index.html?from=USD&to=EUR",
            icon: "shortcut-usd-eur.png"
        },
        {
            name: "Calculator",
            short_name: "Calculator",
            description: "Open currency calculator keypad",
            url: "index.html?action=calc",
            icon: "shortcut-calc.png"
        },
        {
            name: "Search Currency",
            short_name: "Search",
            description: "Search and add world currencies",
            url: "index.html?action=search",
            icon: "shortcut-search.png"
        },
        {
            name: "EUR → USD",
            short_name: "EUR → USD",
            description: "Quick convert Euro to US Dollar",
            url: "index.html?from=EUR&to=USD",
            icon: "shortcut-eur-usd.png"
        }
    ],
    ru: [
        {
            name: "USD → RUB",
            short_name: "USD → RUB",
            description: "Быстрая конвертация долларов в рубли",
            url: "index.html?from=USD&to=RUB",
            icon: "shortcut-usd-rub.png"
        },
        {
            name: "USD → EUR",
            short_name: "USD → EUR",
            description: "Быстрая конвертация долларов в евро",
            url: "index.html?from=USD&to=EUR",
            icon: "shortcut-usd-eur.png"
        },
        {
            name: "Калькулятор",
            short_name: "Калькулятор",
            description: "Открыть встроенный калькулятор",
            url: "index.html?action=calc",
            icon: "shortcut-calc.png"
        },
        {
            name: "Поиск валюты",
            short_name: "Поиск",
            description: "Найти и добавить новую валюту",
            url: "index.html?action=search",
            icon: "shortcut-search.png"
        }
    ],
    es: [
        {
            name: "USD → EUR",
            short_name: "USD → EUR",
            description: "Conversión rápida de dólares a euros",
            url: "index.html?from=USD&to=EUR",
            icon: "shortcut-usd-eur.png"
        },
        {
            name: "Calculadora",
            short_name: "Calculadora",
            description: "Abrir calculadora de divisas",
            url: "index.html?action=calc",
            icon: "shortcut-calc.png"
        },
        {
            name: "Buscar Divisa",
            short_name: "Buscar",
            description: "Buscar y añadir nuevas divisas",
            url: "index.html?action=search",
            icon: "shortcut-search.png"
        },
        {
            name: "EUR → USD",
            short_name: "EUR → USD",
            description: "Conversión rápida de euros a dólares",
            url: "index.html?from=EUR&to=USD",
            icon: "shortcut-eur-usd.png"
        }
    ],
    fr: [
        {
            name: "USD → EUR",
            short_name: "USD → EUR",
            description: "Conversion rapide de dollars en euros",
            url: "index.html?from=USD&to=EUR",
            icon: "shortcut-usd-eur.png"
        },
        {
            name: "Calculatrice",
            short_name: "Calculatrice",
            description: "Ouvrir la calculatrice de devises",
            url: "index.html?action=calc",
            icon: "shortcut-calc.png"
        },
        {
            name: "Rechercher Devise",
            short_name: "Rechercher",
            description: "Rechercher et ajouter des devises",
            url: "index.html?action=search",
            icon: "shortcut-search.png"
        },
        {
            name: "EUR → USD",
            short_name: "EUR → USD",
            description: "Conversion rapide d'euros en dollars",
            url: "index.html?from=EUR&to=USD",
            icon: "shortcut-eur-usd.png"
        }
    ],
    de: [
        {
            name: "EUR → USD",
            short_name: "EUR → USD",
            description: "Schnell Euro in US-Dollar umrechnen",
            url: "index.html?from=EUR&to=USD",
            icon: "shortcut-eur-usd.png"
        },
        {
            name: "Währungsrechner",
            short_name: "Rechner",
            description: "Währungsrechner-Tastatur öffnen",
            url: "index.html?action=calc",
            icon: "shortcut-calc.png"
        },
        {
            name: "Währung suchen",
            short_name: "Suchen",
            description: "Währungen suchen und hinzufügen",
            url: "index.html?action=search",
            icon: "shortcut-search.png"
        },
        {
            name: "USD → EUR",
            short_name: "USD → EUR",
            description: "Schnell US-Dollar in Euro umrechnen",
            url: "index.html?from=USD&to=EUR",
            icon: "shortcut-usd-eur.png"
        }
    ],
    it: [
        {
            name: "EUR → USD",
            short_name: "EUR → USD",
            description: "Conversione rapida da Euro a Dollaro USA",
            url: "index.html?from=EUR&to=USD",
            icon: "shortcut-eur-usd.png"
        },
        {
            name: "Calcolatrice",
            short_name: "Calcolatrice",
            description: "Apri tastierino calcolatrice",
            url: "index.html?action=calc",
            icon: "shortcut-calc.png"
        },
        {
            name: "Cerca Valuta",
            short_name: "Cerca",
            description: "Cerca e aggiungi nuove valute",
            url: "index.html?action=search",
            icon: "shortcut-search.png"
        },
        {
            name: "USD → EUR",
            short_name: "USD → EUR",
            description: "Conversione rapida da Dollaro a Euro",
            url: "index.html?from=USD&to=EUR",
            icon: "shortcut-usd-eur.png"
        }
    ],
    pt: [
        {
            name: "USD → EUR",
            short_name: "USD → EUR",
            description: "Conversão rápida de Dólar para Euro",
            url: "index.html?from=USD&to=EUR",
            icon: "shortcut-usd-eur.png"
        },
        {
            name: "Calculadora",
            short_name: "Calculadora",
            description: "Abrir teclado de calculadora",
            url: "index.html?action=calc",
            icon: "shortcut-calc.png"
        },
        {
            name: "Buscar Moeda",
            short_name: "Buscar",
            description: "Buscar e adicionar moedas",
            url: "index.html?action=search",
            icon: "shortcut-search.png"
        },
        {
            name: "EUR → USD",
            short_name: "EUR → USD",
            description: "Conversão rápida de Euro para Dólar",
            url: "index.html?from=EUR&to=USD",
            icon: "shortcut-eur-usd.png"
        }
    ],
    tr: [
        {
            name: "USD → EUR",
            short_name: "USD → EUR",
            description: "Doları hızlıca Euroya çevir",
            url: "index.html?from=USD&to=EUR",
            icon: "shortcut-usd-eur.png"
        },
        {
            name: "Hesap Makinesi",
            short_name: "Hesapla",
            description: "Döviz hesap makinesini aç",
            url: "index.html?action=calc",
            icon: "shortcut-calc.png"
        },
        {
            name: "Para Birimi Ara",
            short_name: "Ara",
            description: "Para birimi ara ve ekle",
            url: "index.html?action=search",
            icon: "shortcut-search.png"
        },
        {
            name: "EUR → USD",
            short_name: "EUR → USD",
            description: "Euroyu hızlıca Dolara çevir",
            url: "index.html?from=EUR&to=USD",
            icon: "shortcut-eur-usd.png"
        }
    ],
    zh: [
        {
            name: "USD → EUR",
            short_name: "USD → EUR",
            description: "快速将美元兑换为欧元",
            url: "index.html?from=USD&to=EUR",
            icon: "shortcut-usd-eur.png"
        },
        {
            name: "计算器",
            short_name: "计算器",
            description: "打开实时汇率计算器键盘",
            url: "index.html?action=calc",
            icon: "shortcut-calc.png"
        },
        {
            name: "搜索货币",
            short_name: "搜索",
            description: "搜索并添加全球货币",
            url: "index.html?action=search",
            icon: "shortcut-search.png"
        },
        {
            name: "EUR → USD",
            short_name: "EUR → USD",
            description: "快速将欧元兑换为美元",
            url: "index.html?from=EUR&to=USD",
            icon: "shortcut-eur-usd.png"
        }
    ],
    ja: [
        {
            name: "USD → EUR",
            short_name: "USD → EUR",
            description: "米ドルを素早くユーロに換算",
            url: "index.html?from=USD&to=EUR",
            icon: "shortcut-usd-eur.png"
        },
        {
            name: "計算機",
            short_name: "計算機",
            description: "計算機キーパッドを開く",
            url: "index.html?action=calc",
            icon: "shortcut-calc.png"
        },
        {
            name: "通貨を検索",
            short_name: "検索",
            description: "新しい通貨を検索して追加",
            url: "index.html?action=search",
            icon: "shortcut-search.png"
        },
        {
            name: "EUR → USD",
            short_name: "EUR → USD",
            description: "ユーロを素早く米ドルに換算",
            url: "index.html?from=EUR&to=USD",
            icon: "shortcut-eur-usd.png"
        }
    ],
    ko: [
        {
            name: "USD → EUR",
            short_name: "USD → EUR",
            description: "미국 달러를 유로로 빠른 환산",
            url: "index.html?from=USD&to=EUR",
            icon: "shortcut-usd-eur.png"
        },
        {
            name: "계산기",
            short_name: "계산기",
            description: "환율 계산기 키패드 열기",
            url: "index.html?action=calc",
            icon: "shortcut-calc.png"
        },
        {
            name: "통화 검색",
            short_name: "검색",
            description: "새 통화 검색 및 추가",
            url: "index.html?action=search",
            icon: "shortcut-search.png"
        },
        {
            name: "EUR → USD",
            short_name: "EUR → USD",
            description: "유로를 미국 달러로 빠른 환산",
            url: "index.html?from=EUR&to=USD",
            icon: "shortcut-eur-usd.png"
        }
    ],
    hi: [
        {
            name: "USD → EUR",
            short_name: "USD → EUR",
            description: "अमेरिकी डॉलर को तुरंत यूरो में बदलें",
            url: "index.html?from=USD&to=EUR",
            icon: "shortcut-usd-eur.png"
        },
        {
            name: "कैलकुलेटर",
            short_name: "कैलकुलेटर",
            description: "मुद्रा कैलकुलेटर कीपैड खोलें",
            url: "index.html?action=calc",
            icon: "shortcut-calc.png"
        },
        {
            name: "मुद्रा खोजें",
            short_name: "खोजें",
            description: "नई मुद्रा खोजें और जोड़ें",
            url: "index.html?action=search",
            icon: "shortcut-search.png"
        },
        {
            name: "EUR → USD",
            short_name: "EUR → USD",
            description: "यूरो को तुरंत अमेरिकी डॉलर में बदलें",
            url: "index.html?from=EUR&to=USD",
            icon: "shortcut-eur-usd.png"
        }
    ],
    ar: [
        {
            name: "USD → EUR",
            short_name: "USD → EUR",
            description: "تحويل سريع من الدولار إلى اليورو",
            url: "index.html?from=USD&to=EUR",
            icon: "shortcut-usd-eur.png"
        },
        {
            name: "آلة حاسبة",
            short_name: "حاسبة",
            description: "فتح لوحة مفاتيح الحاسبة",
            url: "index.html?action=calc",
            icon: "shortcut-calc.png"
        },
        {
            name: "بحث عن عملة",
            short_name: "بحث",
            description: "البحث عن عملات وإضافتها",
            url: "index.html?action=search",
            icon: "shortcut-search.png"
        },
        {
            name: "EUR → USD",
            short_name: "EUR → USD",
            description: "تحويل سريع من اليورو إلى الدولار",
            url: "index.html?from=EUR&to=USD",
            icon: "shortcut-eur-usd.png"
        }
    ]
};

function createManifest(lang, isRoot = false) {
    const data = manifestsData[lang] || manifestsData.en;
    const rawShortcuts = shortcutsData[lang] || shortcutsData.en;
    const prefix = isRoot ? "./" : "../";

    const shortcuts = rawShortcuts.map(s => ({
        name: s.name,
        short_name: s.short_name,
        description: s.description,
        url: `${prefix}${s.url}`,
        icons: [
            {
                src: `${prefix}icons/${s.icon}`,
                sizes: "192x192",
                type: "image/png"
            }
        ]
    }));

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
        ],
        shortcuts: shortcuts
    };
}

// 0. Ensure icons are generated
try {
    generateIcons();
} catch (err) {
    console.warn('Icon generation notice:', err.message);
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
