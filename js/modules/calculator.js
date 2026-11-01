// ============================================================
// CALCULATOR & MATH EXPRESSION EVALUATOR
// Safe arithmetic evaluation (+, -, *, /, parentheses) without eval().
// ============================================================

/**
 * Safely evaluates a mathematical expression string containing basic arithmetic
 * (+, -, *, /) and parentheses without using eval() or new Function().
 * 
 * @param {string} expr - Expression string to evaluate.
 * @returns {number|null} The numeric result, or null if invalid or divide-by-zero.
 */
function evaluateMathExpression(expr) {
    if (!expr || typeof expr !== 'string') return null;

    let clean = expr.replace(/\s+/g, '').replace(/,/g, '.');
    if (!clean || !/^[0-9.+\-*/()]+$/.test(clean)) return null;

    // Tokenizer
    const tokens = [];
    let i = 0;
    while (i < clean.length) {
        const char = clean[i];
        if ('+-*/()'.includes(char)) {
            tokens.push(char);
            i++;
        } else if (/[0-9.]/.test(char)) {
            let numStr = '';
            while (i < clean.length && /[0-9.]/.test(clean[i])) {
                numStr += clean[i];
                i++;
            }
            if ((numStr.match(/\./g) || []).length > 1) return null;
            tokens.push(parseFloat(numStr));
        } else {
            return null;
        }
    }

    let tokenIndex = 0;

    function peek() {
        return tokens[tokenIndex];
    }

    function get() {
        return tokens[tokenIndex++];
    }

    function parseExpression() {
        let left = parseTerm();
        if (left === null) return null;

        while (peek() === '+' || peek() === '-') {
            const op = get();
            const right = parseTerm();
            if (right === null) return null;
            left = op === '+' ? left + right : left - right;
        }
        return left;
    }

    function parseTerm() {
        let left = parseFactor();
        if (left === null) return null;

        while (peek() === '*' || peek() === '/') {
            const op = get();
            const right = parseFactor();
            if (right === null) return null;
            if (op === '/') {
                if (right === 0) return null;
                left = left / right;
            } else {
                left = left * right;
            }
        }
        return left;
    }

    function parseFactor() {
        const next = peek();

        if (next === '+') {
            get();
            return parseFactor();
        }
        if (next === '-') {
            get();
            const factor = parseFactor();
            return factor !== null ? -factor : null;
        }
        if (next === '(') {
            get();
            const val = parseExpression();
            if (peek() !== ')') return null;
            get();
            return val;
        }
        if (typeof next === 'number' && !isNaN(next)) {
            return get();
        }

        return null;
    }

    try {
        const result = parseExpression();
        if (tokenIndex === tokens.length && typeof result === 'number' && isFinite(result)) {
            return result;
        }
    } catch (_) {
        return null;
    }

    return null;
}

/**
 * Formats evaluated math calculation result cleanly for currency input display,
 * eliminating IEEE 754 floating point inaccuracies (e.g. 0.30000000000000004 or 3.3333333333333335).
 * 
 * @param {number} value - Evaluated numeric result.
 * @param {string} code - Currency code for contextual precision.
 * @returns {string} Clean number string without trailing zeroes or floating noise.
 */
function formatMathResult(value, code) {
    if (value === 0) return '0';
    if (!isFinite(value) || isNaN(value)) return '';

    const digits = (typeof getCurrencyDisplayDigits === 'function') 
        ? getCurrencyDisplayDigits(value, code) 
        : 2;

    // Round off IEEE-754 precision noise at 10 decimals
    const roundedClean = parseFloat(value.toFixed(10));
    const roundedStr = roundedClean.toString();

    const isCrypto = ['BTC', 'ETH', 'TON', 'SOL', 'USDT', 'DOGE', 'XRP', 'BNB'].includes(code);
    const maxCleanDecimals = isCrypto ? Math.max(digits, 6) : Math.max(digits, 4);

    const decPart = roundedStr.includes('.') ? roundedStr.split('.')[1] : '';

    if (decPart.length <= maxCleanDecimals) {
        return roundedStr;
    }

    let formatted = value.toFixed(digits);
    formatted = formatted.replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1');
    return formatted;
}

/**
 * Applies evaluated math result to the specified input element.
 * 
 * @param {HTMLInputElement} input - Target input element.
 */
function applyMathResult(input) {
    if (!input) return;
    
    const code = input.dataset.code;
    const rawValue = input.value.replace(/\s/g, '');
    
    const calculated = evaluateMathExpression(rawValue);
    
    if (calculated !== null) {
        const cleanStr = formatMathResult(calculated, code);
        const formatted = formatExpression(cleanStr);
        input.value = formatted;
        
        currentInputCode = code;
        currentInputValue = cleanStr;
        saveState();
        
        adjustFontSize(input);
        recalculate(code, cleanStr);
    }
}
