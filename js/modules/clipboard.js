// ============================================================
// SMART CLIPBOARD PASTE MODULE
// Automatically detects copied prices / amounts with currencies
// (e.g. "120$", "49.99 EUR", "5000 руб") from clipboard on app focus
// and displays a non-intrusive floating banner: "Сконвертировать 120 USD?".
// ============================================================

/**
 * Mapping of common symbols, currency abbreviations and localized currency slang
 * to official 3-letter ISO / crypto codes.
 */
const CLIPBOARD_CURRENCY_SYMBOLS = {
    // Universal Currency Symbols
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₽': 'RUB',
    '₸': 'KZT',
    '₴': 'UAH',
    '₺': 'TRY',
    '₹': 'INR',
    '₩': 'KRW',
    '₪': 'ILS',
    'zł': 'PLN',
    '฿': 'THB',
    '₫': 'VND',
    '₱': 'PHP',
    '₾': 'GEL',
    '֏': 'AMD',
    '₿': 'BTC',
    'Ξ': 'ETH',
    '₮': 'USDT',
    '💎': 'TON',

    // Slang, names and words in Russian, English and regional languages
    // USD
    'доллар': 'USD', 'долларов': 'USD', 'доллара': 'USD', 'долл': 'USD', 'бакс': 'USD', 'баксов': 'USD', 'бакса': 'USD', 'bucks': 'USD', 'dollar': 'USD', 'dollars': 'USD',
    // EUR
    'евро': 'EUR', 'euro': 'EUR', 'euros': 'EUR',
    // RUB
    'рубль': 'RUB', 'рубля': 'RUB', 'рублей': 'RUB', 'руб': 'RUB', 'руб.': 'RUB', 'р.': 'RUB', 'rur': 'RUB', 'ruble': 'RUB', 'rubles': 'RUB',
    // UZS
    'сум': 'UZS', 'сумов': 'UZS', 'сума': 'UZS', 'som': 'UZS', "so'm": 'UZS', 'сўм': 'UZS',
    // KZT
    'тенге': 'KZT', 'тг': 'KZT', 'тг.': 'KZT', 'кзт': 'KZT', 'tenge': 'KZT',
    // UAH
    'гривна': 'UAH', 'гривны': 'UAH', 'гривен': 'UAH', 'грн': 'UAH', 'грн.': 'UAH', 'hryvnia': 'UAH',
    // BYN
    'белруб': 'BYN', 'бел.руб': 'BYN', 'бел. руб': 'BYN', 'б.р.': 'BYN', 'byn': 'BYN',
    // TRY
    'лира': 'TRY', 'лиры': 'TRY', 'лир': 'TRY', 'tl': 'TRY', 'lira': 'TRY', 'liras': 'TRY',
    // AED
    'дирхам': 'AED', 'дирхамов': 'AED', 'дирхама': 'AED', 'dirham': 'AED', 'dirhams': 'AED',
    // GEL
    'лари': 'GEL', 'lari': 'GEL',
    // AMD
    'драм': 'AMD', 'драмов': 'AMD', 'драма': 'AMD', 'dram': 'AMD',
    // TJS
    'сомони': 'TJS', 'somoni': 'TJS',
    // KGS
    'сом': 'KGS',
    // AZN
    'манат': 'AZN', 'манатов': 'AZN', 'manat': 'AZN',
    // MDL
    'лей': 'MDL', 'леев': 'MDL', 'lei': 'MDL', 'leu': 'MDL',
    // CNY
    'юань': 'CNY', 'юаней': 'CNY', 'юаня': 'CNY', 'yuan': 'CNY', 'rmb': 'CNY',
    // JPY
    'иена': 'JPY', 'иены': 'JPY', 'иен': 'JPY', 'yen': 'JPY',
    // GBP
    'фунт': 'GBP', 'фунтов': 'GBP', 'фунта': 'GBP', 'pound': 'GBP', 'pounds': 'GBP',
    // CHF
    'франк': 'CHF', 'франков': 'CHF', 'франка': 'CHF', 'franc': 'CHF', 'francs': 'CHF',
    // PLN
    'злотый': 'PLN', 'злотых': 'PLN', 'злотого': 'PLN', 'zloty': 'PLN',
    // ILS
    'шекель': 'ILS', 'шекелей': 'ILS', 'шекеля': 'ILS', 'shekel': 'ILS',
    // THB
    'бат': 'THB', 'батов': 'THB', 'бата': 'THB', 'baht': 'THB',
    // INR
    'рупия': 'INR', 'рупий': 'INR', 'рупии': 'INR', 'rupee': 'INR', 'rupees': 'INR',
    // KRW
    'вона': 'KRW', 'воны': 'KRW', 'вон': 'KRW', 'won': 'KRW',
    // BRL
    'реал': 'BRL', 'реалов': 'BRL', 'reais': 'BRL', 'real': 'BRL',
    // Crypto
    'биткоин': 'BTC', 'биткоина': 'BTC', 'биткоинов': 'BTC', 'биток': 'BTC', 'биткойн': 'BTC', 'bitcoin': 'BTC',
    'эфир': 'ETH', 'эфириум': 'ETH', 'ethereum': 'ETH',
    'тезер': 'USDT', 'tether': 'USDT',
    'тон': 'TON', 'тона': 'TON', 'тонов': 'TON', 'toncoin': 'TON',
    'солана': 'SOL', 'соланы': 'SOL', 'solana': 'SOL',
    'доги': 'DOGE', 'догикоин': 'DOGE', 'dogecoin': 'DOGE'
};

// Automatically register all ISO codes and localized currency names from currencyDb if available
if (typeof currencyDb !== 'undefined') {
    Object.keys(currencyDb).forEach(code => {
        CLIPBOARD_CURRENCY_SYMBOLS[code] = code;
        CLIPBOARD_CURRENCY_SYMBOLS[code.toLowerCase()] = code;
        const item = currencyDb[code];
        if (item && item.n) {
            Object.values(item.n).forEach(name => {
                if (name && typeof name === 'string') {
                    const lower = name.toLowerCase().trim();
                    if (lower.length > 2 && lower.length < 30) {
                        CLIPBOARD_CURRENCY_SYMBOLS[lower] = code;
                    }
                }
            });
        }
    });
}

let lastCheckedClipboardText = null;
let smartPasteDismissTimeout = null;
let currentSmartPasteData = null;

/**
 * Helper to escape special characters for RegExp.
 * @param {string} str 
 * @returns {string}
 */
function escapeClipboardRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parses and sanitizes a string into a float, supporting both comma and dot decimal separators.
 * 
 * @param {string} str 
 * @returns {number|null}
 */
function parseClipboardFloat(str) {
    if (!str) return null;
    let s = str.trim().replace(/\s/g, '');
    if (s.includes(',') && s.includes('.')) {
        if (s.lastIndexOf('.') > s.lastIndexOf(',')) {
            s = s.replace(/,/g, '');
        } else {
            s = s.replace(/\./g, '').replace(',', '.');
        }
    } else if (s.includes(',')) {
        s = s.replace(',', '.');
    }
    const val = parseFloat(s);
    return (!isNaN(val) && val > 0 && val < 1e14) ? val : null;
}

/**
 * Parses raw text from the clipboard to detect a monetary amount and currency.
 * Safely ignores port numbers (e.g. :55862) or path numbers in URLs.
 * 
 * Examples:
 *   "http://localhost:55862/?from=BTC&amount=0.00001248" -> { amount: 0.00001248, currency: "BTC" }
 *   "964 889 982.00 UZS" -> { amount: 964889982, currency: "UZS" }
 *   "120$" -> { amount: 120, currency: "USD" }
 *   "49.99 EUR" -> { amount: 49.99, currency: "EUR" }
 *   "5 000 руб" -> { amount: 5000, currency: "RUB" }
 *   "10 000 ₸" -> { amount: 10000, currency: "KZT" }
 * 
 * @param {string} rawText 
 * @returns {{ amount: number, currency: string }|null}
 */
function parseClipboardCurrency(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;
    const text = rawText.trim();
    if (text.length > 500) return null;

    // STEP 1: Check for converter deep link (e.g. ?from=BTC&amount=0.00001248)
    const fromMatch = text.match(/[?&](?:from|code|currency)=([a-zA-Z]{3,5})/i);
    if (fromMatch) {
        const code = fromMatch[1].toUpperCase();
        if (typeof currencyDb !== 'undefined' && currencyDb[code]) {
            const amtMatch = text.match(/[?&](?:amount|val)=([0-9.]+)/i);
            const amt = amtMatch ? parseFloat(amtMatch[1]) : 1;
            if (!isNaN(amt) && amt > 0) {
                return { amount: amt, currency: code };
            }
        }
    }

    // STEP 2: Strip any URLs so port numbers (e.g. :55862) or URL paths
    // are never mistakenly parsed as monetary amounts!
    const cleanText = text.replace(/https?:\/\/[^\s]+/gi, ' ').trim();
    if (!cleanText) return null;

    // Normalize Unicode spaces
    const norm = cleanText.replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ');

    // STEP 3: Symbol prefix (e.g. $120, €49.99, ₿ 0.00001248, ₽ 5000)
    const symbolPrefixMatch = norm.match(/([$€£¥₽₸₴₺₹₩₪฿₫₱₿Ξ₮💎₾֏])\s*([0-9]{1,3}(?:[ ,][0-9]{3})*|[0-9]+)(?:[.,][0-9]{1,12})?/i);
    if (symbolPrefixMatch) {
        const sym = symbolPrefixMatch[1];
        const numStr = symbolPrefixMatch[0].replace(sym, '').trim();
        const code = CLIPBOARD_CURRENCY_SYMBOLS[sym];
        const val = parseClipboardFloat(numStr);
        if (code && val !== null) {
            return { amount: val, currency: code };
        }
    }

    // STEP 4: Symbol suffix (e.g. 120$, 49.99 €, 5000 ₽, 10 000 ₸, 0.00001248 ₿)
    const symbolSuffixMatch = norm.match(/((?:[0-9]{1,3}(?:[ ,][0-9]{3})*|[0-9]+)(?:[.,][0-9]{1,12})?)\s*([$€£¥₽₸₴₺₹₩₪฿₫₱₿Ξ₮💎₾֏])/i);
    if (symbolSuffixMatch) {
        const sym = symbolSuffixMatch[2];
        const numStr = symbolSuffixMatch[1];
        const code = CLIPBOARD_CURRENCY_SYMBOLS[sym];
        const val = parseClipboardFloat(numStr);
        if (code && val !== null) {
            return { amount: val, currency: code };
        }
    }

    // STEP 5: Currency word or code suffix / prefix (e.g. 964 889 982.00 UZS, 100 USD, 49.99 EUR, 5000 руб, 0.00001248 BTC)
    const allWordTokens = Object.keys(CLIPBOARD_CURRENCY_SYMBOLS)
        .filter(t => /^[\p{L}\p{M}.'\-\s]+$/u.test(t))
        .sort((a, b) => b.length - a.length);

    for (const token of allWordTokens) {
        const escaped = escapeClipboardRegex(token);
        // Number before token: "964 889 982.00 UZS", "49.99 EUR", "5000 руб."
        const numBeforeRegex = new RegExp('((?:[0-9]{1,3}(?:[ ,][0-9]{3})*|[0-9]+)(?:[.,][0-9]{1,12})?)\\s*(?:' + escaped + ')(?:[^\\p{L}\\p{M}0-9]|$)', 'iu');
        const m1 = norm.match(numBeforeRegex);
        if (m1) {
            const val = parseClipboardFloat(m1[1]);
            const targetCode = CLIPBOARD_CURRENCY_SYMBOLS[token.toLowerCase()] || CLIPBOARD_CURRENCY_SYMBOLS[token];
            if (val !== null && targetCode) {
                return { amount: val, currency: targetCode };
            }
        }

        // Token before number: "UZS 964 889 982", "EUR 49.99", "USD 120", "BTC 0.00001248"
        const numAfterRegex = new RegExp('(?:^|[^\\p{L}\\p{M}0-9])(?:' + escaped + ')\\s+((?:[0-9]{1,3}(?:[ ,][0-9]{3})*|[0-9]+)(?:[.,][0-9]{1,12})?)', 'iu');
        const m2 = norm.match(numAfterRegex);
        if (m2) {
            const val = parseClipboardFloat(m2[1]);
            const targetCode = CLIPBOARD_CURRENCY_SYMBOLS[token.toLowerCase()] || CLIPBOARD_CURRENCY_SYMBOLS[token];
            if (val !== null && targetCode) {
                return { amount: val, currency: targetCode };
            }
        }
    }

    return null;
}

/**
 * Hides the smart paste floating banner with a slide-up animation.
 */
function hideSmartPasteBanner() {
    const banner = document.getElementById('smart-paste-banner');
    if (!banner) return;

    if (smartPasteDismissTimeout) {
        clearTimeout(smartPasteDismissTimeout);
        smartPasteDismissTimeout = null;
    }

    banner.classList.remove('visible');
    setTimeout(() => {
        if (!banner.classList.contains('visible')) {
            banner.hidden = true;
        }
    }, 320);
}

/**
 * Displays the non-intrusive smart paste banner at the top of the screen.
 * 
 * @param {number} amount 
 * @param {string} currency 
 */
function showSmartPasteBanner(amount, currency) {
    const banner = document.getElementById('smart-paste-banner');
    const flagEl = document.getElementById('smart-paste-flag');
    const textEl = document.getElementById('smart-paste-text');
    const applyBtn = document.getElementById('smart-paste-apply');

    if (!banner || !textEl) return;

    currentSmartPasteData = { amount, currency };

    // Set currency flag
    let flag = '💵';
    if (typeof currencyDb !== 'undefined' && currencyDb[currency] && currencyDb[currency].f) {
        flag = currencyDb[currency].f;
    }
    if (flagEl) flagEl.textContent = flag;

    // Localized prompt: "Сконвертировать 120 USD?"
    const formattedAmount = (typeof formatConvertedValue === 'function') 
        ? formatConvertedValue(amount, currency)
        : ((typeof formatNumberString === 'function') ? formatNumberString(amount.toString()) : amount.toString());

    const t = (typeof i18n !== 'undefined' && i18n[state.lang]) ? i18n[state.lang] : null;
    let promptTemplate = (t && t.convertPrompt) 
        ? t.convertPrompt 
        : (state.lang === 'ru' ? 'Сконвертировать {amount} {code}?' : 'Convert {amount} {code}?');

    textEl.textContent = promptTemplate.replace('{amount}', formattedAmount).replace('{code}', currency);

    if (applyBtn) {
        applyBtn.textContent = (t && t.pasteAction) 
            ? t.pasteAction 
            : (state.lang === 'ru' ? 'Вставить' : 'Paste');
    }

    banner.hidden = false;
    requestAnimationFrame(() => {
        banner.classList.add('visible');
    });

    // Auto-dismiss banner after 8 seconds of inactivity
    if (smartPasteDismissTimeout) clearTimeout(smartPasteDismissTimeout);
    smartPasteDismissTimeout = setTimeout(() => {
        hideSmartPasteBanner();
    }, 8000);
}

/**
 * Applies the detected clipboard currency and amount into the active converter view.
 * 
 * @param {number} amount 
 * @param {string} currency 
 */
function applySmartPaste(amount, currency) {
    hideSmartPasteBanner();
    triggerHaptic(15);

    const fromCode = currency.toUpperCase();
    const strAmount = String(amount);

    // If Quick Mode is active, exit it so user sees their full list or normal mode
    if (typeof isQuickMode !== 'undefined' && isQuickMode) {
        if (typeof exitQuickMode === 'function') {
            exitQuickMode();
        }
    }

    // Ensure permanentFavorites is backed up before session override
    if (!Array.isArray(permanentFavorites) || permanentFavorites.length === 0) {
        permanentFavorites = [...state.favorites];
    }

    // Treat pasted conversion as a dynamic session view without corrupting localStorage
    isLinkSession = true;
    state.favorites = [fromCode, ...permanentFavorites.filter(c => c !== fromCode)];

    currentInputCode = fromCode;
    currentInputValue = strAmount;

    if (typeof renderMain === 'function') {
        renderMain();
    }

    const inputEl = document.getElementById(`input-${fromCode}`);
    if (inputEl) {
        const card = inputEl.closest('.currency-card');
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (isTouchDevice()) {
            if (typeof openVirtualKeypad === 'function') {
                openVirtualKeypad(inputEl);
            }
        } else {
            inputEl.focus({ preventScroll: true });
            const len = inputEl.value.length;
            inputEl.setSelectionRange(len, len);
        }
    }
}

/**
 * Checks the system clipboard asynchronously if permitted by the browser.
 */
async function checkClipboardForCurrency() {
    if (!navigator.clipboard || !navigator.clipboard.readText) return;
    if (typeof document !== 'undefined' && document.visibilityState && document.visibilityState !== 'visible') return;

    try {
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const perm = await navigator.permissions.query({ name: 'clipboard-read' });
                if (perm.state === 'denied') return;
            } catch (_) {}
        }

        const text = await navigator.clipboard.readText();
        if (!text || text === lastCheckedClipboardText) return;
        lastCheckedClipboardText = text;

        const parsed = parseClipboardCurrency(text);
        if (!parsed) return;

        // Skip prompt if this exact currency and amount is already actively displayed
        if (currentInputCode === parsed.currency && String(currentInputValue) === String(parsed.amount)) {
            return;
        }

        showSmartPasteBanner(parsed.amount, parsed.currency);
    } catch (_) {
        // Silently catch permissions rejection or not-allowed without throwing
    }
}

/**
 * Initializes listeners for Smart Clipboard Paste.
 */
function initClipboardModule() {
    const applyBtn = document.getElementById('smart-paste-apply');
    const dismissBtn = document.getElementById('smart-paste-dismiss');

    if (applyBtn) {
        applyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentSmartPasteData) {
                applySmartPaste(currentSmartPasteData.amount, currentSmartPasteData.currency);
            }
        });
    }

    if (dismissBtn) {
        dismissBtn.addEventListener('click', (e) => {
            e.preventDefault();
            hideSmartPasteBanner();
        });
    }

    // Check clipboard when user returns to the app / window focuses
    window.addEventListener('focus', () => {
        setTimeout(checkClipboardForCurrency, 200);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            setTimeout(checkClipboardForCurrency, 300);
        }
    });

    // Check once after initial boot
    setTimeout(checkClipboardForCurrency, 800);
}
