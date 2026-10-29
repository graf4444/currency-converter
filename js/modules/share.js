// ============================================================
// SHARE BREAKDOWN & CLIPBOARD EXPORT ENGINE
// Generates formatted currency calculation breakdowns and handles
// native Web Share API (navigator.share) with clipboard fallback.
// ============================================================

/**
 * Constructs an interactive direct link to the converter pre-filled
 * with the base currency and calculation amount.
 * 
 * @param {string} fromCode - Source currency code
 * @param {number|string} [amount] - Calculation amount
 * @param {string} [toCode] - Optional target currency code
 * @returns {string} Fully qualified web URL
 */
/**
 * Automatically detects the current base URL where the application is running
 * (localhost, Cloudflare Pages, GitHub Pages, or any custom domain)
 * and constructs an interactive deep-link with pre-filled conversion params.
 * 
 * @param {string} fromCode - Source currency code
 * @param {number|string} [amount] - Calculation amount
 * @param {string} [toCode] - Optional target currency code
 * @returns {string} Fully qualified web URL
 */
function getAppShareUrl(fromCode, amount, toCode) {
    let baseUrl = 'https://graf4444.github.io/currency-converter/';

    if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null') {
        const protocol = window.location.protocol;
        if (protocol === 'http:' || protocol === 'https:') {
            let path = window.location.pathname || '/';
            path = path.replace(/\/index\.html$/i, '/');
            if (!path.endsWith('/')) {
                path += '/';
            }
            baseUrl = `${window.location.origin}${path}`;
        }
    }

    const params = new URLSearchParams();
    if (fromCode) params.set('from', fromCode);
    if (toCode) params.set('to', toCode);
    if (amount) params.set('amount', amount);
    const qs = params.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
}

/**
 * Returns flag emoji or symbol for a given currency code.
 * 
 * @param {string} code - Currency code
 * @returns {string} Flag emoji or empty string
 */
function getCurrencyFlag(code) {
    if (typeof currencyDb !== 'undefined' && currencyDb[code] && currencyDb[code].f) {
        return currencyDb[code].f;
    }
    return '';
}

/**
 * Generates a clean, readable text summary of the current conversion
 * with flags, bullet points, exchange rate date, and interactive app link.
 * 
 * Example:
 *   🇺🇸 100 USD =
 *   • 🇪🇺 94.20 EUR
 *   • 🇷🇺 9 250.00 RUB
 *   • 🇹🇷 3 675.00 TRY
 * 
 *   📅 Курс на 29.10.2026
 *   🔗 Конвертер валют:
 *   https://graf4444.github.io/currency-converter/?from=USD&amount=100
 * 
 * @param {string} [baseCode] - The source currency code (defaults to active input)
 * @returns {string} Formatted breakdown string
 */
function generateShareText(baseCode) {
    const code = baseCode || currentInputCode || (state.favorites && state.favorites[0]) || 'USD';
    const inputEl = document.getElementById(`input-${code}`);
    const rawVal = inputEl ? inputEl.value.trim() : (currentInputValue || '1');

    let val = evaluateMathExpression(rawVal);
    if (val === null) {
        val = parseFloat(parseCleanNumber(rawVal));
    }
    if (isNaN(val) || val <= 0) {
        val = 1;
    }

    const baseFlag = getCurrencyFlag(code);
    const formattedBaseVal = formatNumberString(val.toString());
    const baseHeader = baseFlag ? `${baseFlag} ${formattedBaseVal} ${code} =` : `${formattedBaseVal} ${code} =`;
    const lines = [baseHeader];

    let toCode = null;
    if (state.favorites && state.favorites.length === 2) {
        toCode = state.favorites.find(c => c !== code) || null;
    }

    const baseRate = state.rates[code];
    if (baseRate && state.favorites) {
        const valInUSD = val / baseRate;
        state.favorites.forEach(c => {
            if (c !== code && state.rates[c]) {
                const result = valInUSD * state.rates[c];
                let digits = 2;
                if (state.rates[c] < 0.001) digits = 6;
                else if (state.rates[c] < 0.1) digits = 4;
                const formattedRes = formatNumberString(result.toFixed(digits));
                const targetFlag = getCurrencyFlag(c);
                const itemLine = targetFlag ? `• ${targetFlag} ${formattedRes} ${c}` : `• ${formattedRes} ${c}`;
                lines.push(itemLine);
            }
        });
    }

    // Date formatting (DD.MM.YYYY)
    const d = state.lastUpdatedTimestamp ? new Date(state.lastUpdatedTimestamp) : new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;

    const t = (typeof i18n !== 'undefined' && i18n[state.lang]) ? i18n[state.lang] : null;
    const rateOnText = (t && t.rateOn) ? t.rateOn : (state.lang === 'ru' ? 'Курс на' : 'Rates as of');
    const appTitle = (t && t.title) ? t.title : 'Currency Converter';

    const shareUrl = getAppShareUrl(code, val, toCode);

    lines.push('');
    lines.push(`📅 ${rateOnText} ${dateStr}`);
    lines.push(`🔗 ${appTitle}:`);
    lines.push(shareUrl);

    return lines.join('\n');
}

/**
 * Triggers native share sheet (on mobile/supported browsers)
 * or copies the calculation breakdown directly to clipboard.
 * 
 * @param {string} [baseCode] - Currency code
 * @param {Event} [e] - Click event
 */
async function shareBreakdown(baseCode, e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    triggerHaptic(15);

    const code = baseCode || currentInputCode || (state.favorites && state.favorites[0]) || 'USD';
    const shareText = generateShareText(code);
    const title = `${code} Exchange Breakdown`;

    const t = (typeof i18n !== 'undefined' && i18n[state.lang]) ? i18n[state.lang] : null;
    const copiedMsg = (t && t.copiedToClipboard) 
        ? t.copiedToClipboard 
        : (state.lang === 'ru' ? 'Расчёт скопирован в буфер обмена' : 'Breakdown copied to clipboard');

    // 1. Try native Web Share API (mobile phones, Android, Safari iOS/macOS)
    if (navigator.share && isTouchDevice()) {
        try {
            await navigator.share({
                title: title,
                text: shareText
            });
            return;
        } catch (err) {
            // If user simply closed/aborted share dialog, exit cleanly
            if (err.name === 'AbortError') return;
        }
    }

    // 2. Clipboard fallback (desktop, or if native share failed/unsupported)
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareText);
            showToast(copiedMsg);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = shareText;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast(copiedMsg);
        }
    } catch (clipErr) {
        console.error('Failed to copy to clipboard', clipErr);
        showToast(copiedMsg);
    }
}

/**
 * Attaches share button listener in the virtual keypad header.
 */
function setupShareEvents() {
    const keypadShareBtn = document.getElementById('keypad-share');
    if (keypadShareBtn) {
        keypadShareBtn.addEventListener('click', (e) => {
            shareBreakdown(currentInputCode, e);
        });
    }
}
