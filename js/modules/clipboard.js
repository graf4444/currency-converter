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
    '$': 'USD',
    '€': 'EUR',
    '₽': 'RUB',
    'руб': 'RUB',
    'руб.': 'RUB',
    'рублей': 'RUB',
    'рубля': 'RUB',
    'rur': 'RUB',
    '£': 'GBP',
    '¥': 'JPY',
    '₸': 'KZT',
    'тенге': 'KZT',
    '₴': 'UAH',
    'грн': 'UAH',
    'гривен': 'UAH',
    'гривны': 'UAH',
    '₺': 'TRY',
    'лир': 'TRY',
    'лиры': 'TRY',
    'сум': 'UZS',
    'som': 'UZS',
    'драм': 'AMD',
    'лари': 'GEL',
    'сомони': 'TJS',
    'сом': 'KGS',
    'дирхам': 'AED',
    '₹': 'INR',
    '₩': 'KRW',
    '₪': 'ILS',
    'zł': 'PLN',
    '฿': 'THB',
    '₿': 'BTC',
    'btc': 'BTC',
    'Ξ': 'ETH',
    'eth': 'ETH',
    '₮': 'USDT',
    'usdt': 'USDT',
    '💎': 'TON',
    'ton': 'TON',
    'sol': 'SOL',
    'doge': 'DOGE',
    'xrp': 'XRP',
    'bnb': 'BNB'
};

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
 * Parses raw text from the clipboard to detect a monetary amount and currency.
 * 
 * Examples:
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
    if (text.length > 100) return null;

    // Normalize Unicode spaces
    const norm = text.replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ');

    const dbCodes = (typeof currencyDb !== 'undefined') ? Object.keys(currencyDb) : [];
    const symbolKeys = Object.keys(CLIPBOARD_CURRENCY_SYMBOLS);

    // Sort tokens by length descending so longer words match first (e.g. "рублей" before "руб")
    const allTokens = [...symbolKeys, ...dbCodes].sort((a, b) => b.length - a.length);

    let detectedCurrency = null;
    let detectedAmount = null;

    for (const token of allTokens) {
        const isLetterCode = /^[A-Za-zА-Яа-яЁё]+$/.test(token);
        const escaped = escapeClipboardRegex(token);
        const pattern = isLetterCode 
            ? new RegExp('(^|[^a-zA-Zа-яА-ЯёЁ0-9])' + escaped + '([^a-zA-Zа-яА-ЯёЁ0-9]|$)', 'i') 
            : new RegExp(escaped, 'i');

        if (pattern.test(norm)) {
            const upperToken = token.toUpperCase();
            let targetCode = null;

            if (typeof currencyDb !== 'undefined' && currencyDb[upperToken]) {
                targetCode = upperToken;
            } else {
                targetCode = CLIPBOARD_CURRENCY_SYMBOLS[token.toLowerCase()] || CLIPBOARD_CURRENCY_SYMBOLS[token];
            }

            if (targetCode) {
                // Extract number by removing the currency token first
                const withoutToken = norm.replace(pattern, ' ');
                const numMatch = withoutToken.match(/(?:[0-9]{1,3}(?:[ ,][0-9]{3})+|[0-9]+)(?:[.,][0-9]{1,6})?/);

                if (numMatch) {
                    let numStr = numMatch[0].replace(/\s/g, '');
                    if (numStr.includes(',') && numStr.includes('.')) {
                        if (numStr.lastIndexOf('.') > numStr.lastIndexOf(',')) {
                            numStr = numStr.replace(/,/g, '');
                        } else {
                            numStr = numStr.replace(/\./g, '').replace(',', '.');
                        }
                    } else if (numStr.includes(',')) {
                        numStr = numStr.replace(',', '.');
                    }

                    const num = parseFloat(numStr);
                    if (!isNaN(num) && num > 0 && num < 1e14) {
                        detectedCurrency = targetCode;
                        detectedAmount = num;
                        break;
                    }
                }
            }
        }
    }

    if (detectedCurrency && detectedAmount !== null) {
        return { amount: detectedAmount, currency: detectedCurrency };
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
    const formattedAmount = (typeof formatNumberString === 'function') 
        ? formatNumberString(amount.toString()) 
        : amount.toString();

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

    // Ensure currency is in favorites and brought to top
    if (state.favorites) {
        if (!state.favorites.includes(fromCode)) {
            state.favorites.unshift(fromCode);
        } else if (state.favorites[0] !== fromCode) {
            state.favorites = [fromCode, ...state.favorites.filter(c => c !== fromCode)];
        }
    }

    currentInputCode = fromCode;
    currentInputValue = strAmount;
    saveState();

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
    if (typeof document.hasFocus === 'function' && !document.hasFocus()) return;

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
