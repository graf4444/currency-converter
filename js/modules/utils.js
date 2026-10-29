// ============================================================
// UTILITY FUNCTIONS
// Formatting, string manipulation, touch, and platform helpers.
// ============================================================

/**
 * Formats mathematical expression numbers with space thousand separators.
 * E.g., "1234567.89+5000" -> "1 234 567.89+5 000"
 */
function formatExpression(str) {
    if (!str) return '';
    return str.replace(/(\d+)(\.\d*)?/g, (match, intPart, decPart) => {
        const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return formattedInt + (decPart !== undefined ? decPart : '');
    });
}

function formatNumberString(str) {
    return formatExpression(str);
}

/**
 * Calculates optimal decimal precision for displaying a currency conversion result.
 * Ensures significant digits are preserved for cryptocurrencies and high-value exchange rates,
 * avoiding truncation loss (e.g. 1 USD -> 0.0000125 BTC instead of 0.000012).
 * 
 * @param {number} result - Converted numerical value
 * @param {string} code - Target currency code
 * @returns {number} Decimal digits to display
 */
function getCurrencyDisplayDigits(result, code) {
    if (!result || isNaN(result) || result === 0) return 2;
    const abs = Math.abs(result);
    const isCrypto = ['BTC', 'ETH', 'TON', 'SOL', 'USDT', 'DOGE', 'XRP', 'BNB'].includes(code);

    if (abs >= 100) return 2;
    if (abs >= 0.1 && !isCrypto) return 2;
    if (abs >= 1 && isCrypto) return 4;

    const str = abs.toFixed(12);
    const decimalPart = str.split('.')[1] || '';
    let leadingZeros = 0;
    while (leadingZeros < decimalPart.length && decimalPart[leadingZeros] === '0') {
        leadingZeros++;
    }

    const needed = leadingZeros + (isCrypto ? 4 : 3);
    return Math.min(8, Math.max(2, needed));
}

/**
 * Formats a converted currency result with dynamic precision and clean trailing zeroes.
 * 
 * @param {number} result 
 * @param {string} code 
 * @returns {string} Formatted number string ready for display
 */
function formatConvertedValue(result, code) {
    if (result === 0 || isNaN(result)) return '';
    const digits = getCurrencyDisplayDigits(result, code);
    let formatted = result.toFixed(digits);

    if (digits > 2) {
        formatted = formatted.replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1');
    }
    return formatNumberString(formatted);
}

function parseCleanNumber(str) {
    return str.replace(/\s/g, '');
}

/**
 * Dynamically adjusts font size of currency input based on text length.
 */
function adjustFontSize(input) {
    const len = input.value.length;
    if (len > 16) input.style.fontSize = '0.85rem';
    else if (len > 11) input.style.fontSize = '1.1rem';
    else input.style.fontSize = '1.4rem';
}

/**
 * Counts non-whitespace characters in a string.
 */
function countNonSpaces(str) {
    if (!str) return 0;
    let count = 0;
    for (let i = 0; i < str.length; i++) {
        if (!/\s/.test(str[i])) count++;
    }
    return count;
}

/**
 * Maps cursor position based on non-space character count.
 */
function findCursorPosByNonSpaceCount(str, targetCount) {
    if (targetCount <= 0) return 0;
    let count = 0;
    for (let i = 0; i < str.length; i++) {
        if (!/\s/.test(str[i])) {
            count++;
            if (count === targetCount) {
                return i + 1;
            }
        }
    }
    return str.length;
}

/**
 * Returns current cursor/selection bounds for an input element.
 */
function getCursorSelection(input) {
    let start = input.selectionStart;
    let end = input.selectionEnd;
    const val = input.value || '';
    if (start === null || end === null || start === undefined) {
        start = val.length;
        end = val.length;
    }
    return { start, end, val };
}

/**
 * Triggers subtle haptic feedback on supported mobile devices.
 */
function triggerHaptic(duration = 10) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
            navigator.vibrate(duration);
        } catch (_) {}
    }
}

/**
 * Checks whether current device has touch capabilities.
 */
function isTouchDevice() {
    return (
        'ontouchstart' in window ||
        (Boolean(navigator.maxTouchPoints) && navigator.maxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    );
}

/**
 * Checks if the current page load is an explicit user reload (F5 / Cmd+R / pull-to-refresh).
 */
function isPageReload() {
    try {
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries && navEntries.length > 0) {
            return navEntries[0].type === 'reload';
        }
        if (window.performance && window.performance.navigation) {
            return window.performance.navigation.type === 1; // PerformanceNavigation.TYPE_RELOAD
        }
    } catch (_) {}
    return false;
}
