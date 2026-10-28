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
        const formatted = formatExpression(calculated.toString());
        input.value = formatted;
        
        currentInputCode = code;
        currentInputValue = calculated.toString();
        saveState();
        
        adjustFontSize(input);
        recalculate(code, calculated.toString());
    }
}
