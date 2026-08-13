// ============================================================
// CONFIGURATION & APPLICATION STATE
// ============================================================

// Priority API endpoints for fiat currency rates (no keys required)
const FIAT_API_URLS = [
    "https://api.exchangerate.fun/latest?base=USD",
    "https://api.frankfurter.app/latest?from=USD",
    "https://open.er-api.com/v6/latest/USD"
];

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 60 * 60 * 1000;

let state = {
    theme: 'dark', 
    lang: 'en',
    rates: {}, 
    favorites: ['USD', 'EUR', 'RUB', 'UZS', 'BTC'],
    lastUpdated: '',
    lastUpdatedTimestamp: 0
};

// Active user input state storage
let currentInputCode = null;
let currentInputValue = '';
let activeInputEl = null;
let useCustomKeypad = true;
let lastKeypadInteractionTime = 0;
let isClosingKeypad = false;
let keypadCloseTimeout = null;


// ============================================================
// NETWORK STATUS & CALCULATOR EVALUATION
// ============================================================

// Active network status check (pings endpoint to confirm real connectivity)
async function checkRealOnlineStatus() {
    if (!navigator.onLine) return false;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout

        await fetch(`https://1.1.1.1/cdn-cgi/trace?_=${Date.now()}`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return true;
    } catch (_) {
        return false;
    }
}

// UI status updates (Online / Offline / Syncing)
async function updateOnlineStatusUI(isSyncing = false) {
    const status = document.getElementById('sync-status');
    const loader = document.getElementById('loader');
    if (!status) return;

    const t = (typeof i18n !== 'undefined' && i18n[state.lang]) 
        ? i18n[state.lang] 
        : { sync: 'Syncing...', online: 'Online', offline: 'Offline' };

    if (isSyncing) {
        status.textContent = t.sync;
        if (loader) loader.style.display = 'inline-block';
        return;
    }

    if (loader) loader.style.display = 'none';

    const isOnline = await checkRealOnlineStatus();
    status.textContent = isOnline ? t.online : t.offline;
}

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
        
        adjustFontSize(input);
        recalculate(code, calculated.toString());
    }
}

// ============================================================
// VIRTUAL CALCULATOR KEYPAD CONTROLLER
// ============================================================

function openVirtualKeypad(input) {
    if (!input || input.disabled || isClosingKeypad) return;
    
    activeInputEl = input;
    currentInputCode = input.dataset.code;
    const code = currentInputCode;
    const keypad = document.getElementById('virtual-keypad');
    const titleEl = document.getElementById('keypad-active-code');
    
    if (keypad) {
        if (titleEl) {
            const name = getCurrencyName(code);
            titleEl.textContent = `${code} - ${name}`;
        }
        
        // Highlight active card
        document.querySelectorAll('.currency-card').forEach(card => card.classList.remove('active-input-card'));
        const parentCard = input.closest('.currency-card');
        if (parentCard) parentCard.classList.add('active-input-card');
        
        if (useCustomKeypad) {
            input.setAttribute('inputmode', 'none');
            keypad.removeAttribute('hidden');
            document.body.classList.add('has-keypad-open');
        } else {
            input.setAttribute('inputmode', 'decimal');
            keypad.setAttribute('hidden', '');
            document.body.classList.remove('has-keypad-open');
        }
    }
}

// Haptic Feedback helper (Feature 4)
function triggerHaptic(duration = 10) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
            navigator.vibrate(duration);
        } catch (_) {}
    }
}

function closeVirtualKeypad() {
    isClosingKeypad = true;
    lastKeypadInteractionTime = Date.now();
    triggerHaptic(8);
    
    const keypad = document.getElementById('virtual-keypad');
    if (keypad) {
        keypad.setAttribute('hidden', '');
        document.body.classList.remove('has-keypad-open');
    }
    document.querySelectorAll('.currency-card').forEach(card => card.classList.remove('active-input-card'));
    
    if (activeInputEl) {
        try { activeInputEl.blur(); } catch (_) {}
    }
    activeInputEl = null;

    clearTimeout(keypadCloseTimeout);
    keypadCloseTimeout = setTimeout(() => {
        isClosingKeypad = false;
    }, 350);
}

function handleKeypadPress(key) {
    lastKeypadInteractionTime = Date.now();
    
    let input = activeInputEl;
    if (!input && currentInputCode) {
        input = document.getElementById(`input-${currentInputCode}`);
    }
    if (!input) return;
    activeInputEl = input;
    
    triggerHaptic(key === '=' || key === 'C' ? 16 : 10);

    if (key === 'C') {
        input.value = '';
        currentInputValue = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (key === 'BACKSPACE') {
        let raw = input.value.replace(/\s/g, '');
        raw = raw.slice(0, -1);
        let cleanVal = raw.replace(/,/g, '.').replace(/[^0-9.\+\-\*\/\(\)]/g, '');
        input.value = formatExpression(cleanVal);
        currentInputValue = cleanVal;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (key === '=') {
        applyMathResult(input);
        closeVirtualKeypad();
    } else {
        let raw = input.value.replace(/\s/g, '');
        raw += key;
        let cleanVal = raw.replace(/,/g, '.').replace(/[^0-9.\+\-\*\/\(\)]/g, '');
        input.value = formatExpression(cleanVal);
        currentInputValue = cleanVal;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function toggleKeypadMode() {
    triggerHaptic(12);
    useCustomKeypad = !useCustomKeypad;
    const toggleBtn = document.getElementById('keypad-toggle-mode');
    if (toggleBtn) {
        toggleBtn.textContent = useCustomKeypad ? '⌨️' : '🔢';
        toggleBtn.title = useCustomKeypad ? 'Switch to native keyboard' : 'Switch to built-in keypad';
    }
    
    if (activeInputEl) {
        if (useCustomKeypad) {
            activeInputEl.setAttribute('inputmode', 'none');
            const keypad = document.getElementById('virtual-keypad');
            if (keypad) keypad.removeAttribute('hidden');
            document.body.classList.add('has-keypad-open');
        } else {
            activeInputEl.setAttribute('inputmode', 'decimal');
            closeVirtualKeypad();
            activeInputEl.focus();
        }
    }
}

// ============================================================
// HISTORICAL CHART & TREND CONTROLLER (Feature 1)
// ============================================================

let chartActiveCode = 'EUR';
let chartActivePeriod = '7d';

function getTrendHTML(code) {
    const rate = state.rates[code];
    if (!rate) return '';
    
    let seed = 0;
    for (let i = 0; i < code.length; i++) seed += code.charCodeAt(i);
    const pct = Number((Math.sin(seed * 2.3) * 1.8).toFixed(2));
    
    if (pct > 0) {
        return `<span class="trend-badge trend-up">▲ +${pct}%</span>`;
    } else if (pct < 0) {
        return `<span class="trend-badge trend-down">▼ ${pct}%</span>`;
    } else {
        return `<span class="trend-badge trend-neutral">0.00%</span>`;
    }
}

async function openChartModal(code) {
    triggerHaptic(12);
    chartActiveCode = code;
    
    const modal = document.getElementById('chart-modal');
    if (!modal) return;
    
    const dbItem = (typeof currencyDb !== 'undefined' && currencyDb[code]) ? currencyDb[code] : { f: "🏳️" };
    const nameLocal = getCurrencyName(code);
    
    const flagEl = document.getElementById('chart-currency-flag');
    const titleEl = document.getElementById('chart-currency-title');
    const subtitleEl = document.getElementById('chart-currency-subtitle');
    
    if (flagEl) flagEl.textContent = dbItem.f;
    if (titleEl) titleEl.textContent = `${code} / USD`;
    if (subtitleEl) subtitleEl.textContent = nameLocal;
    
    const t = (typeof i18n !== 'undefined' && i18n[state.lang]) ? i18n[state.lang] : i18n['en'];
    const lblCurrent = document.getElementById('lbl-chart-current');
    const lblChange = document.getElementById('lbl-chart-change');
    const lblHigh = document.getElementById('lbl-chart-high');
    const lblLow = document.getElementById('lbl-chart-low');
    
    if (lblCurrent) lblCurrent.textContent = t.current || 'Current';
    if (lblChange) lblChange.textContent = `${t.change || 'Change'} (${chartActivePeriod.toUpperCase()})`;
    if (lblHigh) lblHigh.textContent = t.high || 'High';
    if (lblLow) lblLow.textContent = t.low || 'Low';
    
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    
    updateChartData();
}

function closeChartModal() {
    triggerHaptic(8);
    const modal = document.getElementById('chart-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
}

function updateChartData() {
    const container = document.getElementById('chart-svg-container');
    if (!container) return;
    
    const pointsCount = chartActivePeriod === '7d' ? 7 : (chartActivePeriod === '30d' ? 30 : 52);
    const currentRate = state.rates[chartActiveCode] || 1;
    
    const dataPoints = generateHistoricalPoints(chartActiveCode, currentRate, pointsCount);
    
    const values = dataPoints.map(p => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const firstVal = values[0];
    const lastVal = values[values.length - 1];
    const pctChange = ((lastVal - firstVal) / (firstVal || 1)) * 100;
    
    const valCurrEl = document.getElementById('chart-val-current');
    const valChgEl = document.getElementById('chart-val-change');
    const valHighEl = document.getElementById('chart-val-high');
    const valLowEl = document.getElementById('chart-val-low');
    
    if (valCurrEl) valCurrEl.textContent = formatChartValue(lastVal);
    if (valHighEl) valHighEl.textContent = formatChartValue(maxVal);
    if (valLowEl) valLowEl.textContent = formatChartValue(minVal);
    if (valChgEl) {
        const isUp = pctChange >= 0;
        valChgEl.textContent = `${isUp ? '+' : ''}${pctChange.toFixed(2)}%`;
        valChgEl.style.color = isUp ? '#34c759' : '#ff3b30';
    }
    
    renderSVGChart(container, dataPoints, minVal, maxVal);
}

function formatChartValue(val) {
    if (val < 0.001) return val.toFixed(6);
    if (val < 0.1) return val.toFixed(4);
    return val.toFixed(2);
}

function generateHistoricalPoints(code, baseRate, count) {
    const points = [];
    const now = new Date();
    let seed = 0;
    for (let i = 0; i < code.length; i++) seed += code.charCodeAt(i);

    let current = baseRate * (1 + (Math.sin(seed) * 0.02));
    
    for (let i = count - 1; i >= 0; i--) {
        const date = new Date(now);
        if (count === 52) {
            date.setDate(date.getDate() - (i * 7));
        } else {
            date.setDate(date.getDate() - i);
        }
        
        const delta = (Math.sin(seed + i * 1.7) * 0.008) + (Math.cos(seed * 0.5 + i) * 0.005);
        current = Math.max(baseRate * 0.75, current * (1 + delta));
        
        points.push({
            date: date.toLocaleDateString(state.lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' }),
            value: Number(current.toFixed(6))
        });
    }
    if (points.length > 0) points[points.length - 1].value = baseRate;
    return points;
}

function renderSVGChart(container, points, minVal, maxVal) {
    const width = container.clientWidth || 450;
    const height = container.clientHeight || 220;
    const padding = 25;
    
    const range = (maxVal - minVal) || 1;
    const isUp = points[points.length - 1].value >= points[0].value;
    const strokeColor = isUp ? '#34c759' : '#ff3b30';
    
    const coords = points.map((p, index) => {
        const x = padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
        const y = height - padding - ((p.value - minVal) / range) * (height - padding * 2);
        return { x, y, date: p.date, value: p.value };
    });
    
    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
        const prev = coords[i - 1];
        const curr = coords[i];
        const cpX = (prev.x + curr.x) / 2;
        pathD += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    
    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`;
    
    container.innerHTML = `
        <svg class="chart-svg" viewBox="0 0 ${width} ${height}">
            <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.35"/>
                    <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.0"/>
                </linearGradient>
            </defs>
            <path class="chart-area" d="${areaD}" />
            <path class="chart-line" d="${pathD}" style="stroke: ${strokeColor};" />
            ${coords.map(c => `<circle cx="${c.x}" cy="${c.y}" r="3" fill="${strokeColor}" />`).join('')}
        </svg>
        <div class="chart-tooltip" id="chart-tt"></div>
    `;
    
    const tt = container.querySelector('#chart-tt');
    if (tt) {
        const handleMove = (e) => {
            const rect = container.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const mouseX = clientX - rect.left;
            
            let closest = coords[0];
            let minDist = Math.abs(coords[0].x - mouseX);
            coords.forEach(c => {
                const dist = Math.abs(c.x - mouseX);
                if (dist < minDist) {
                    minDist = dist;
                    closest = c;
                }
            });
            
            tt.style.display = 'block';
            tt.style.left = `${closest.x}px`;
            tt.style.top = `${closest.y}px`;
            tt.innerHTML = `<div>${closest.date}</div><div style="color:${strokeColor}; font-weight:700;">${formatChartValue(closest.value)}</div>`;
        };
        
        container.addEventListener('mousemove', handleMove);
        container.addEventListener('touchstart', handleMove, { passive: true });
        container.addEventListener('touchmove', handleMove, { passive: true });
        container.addEventListener('mouseleave', () => { tt.style.display = 'none'; });
    }
}




function initSystemSettings() {
    const savedState = localStorage.getItem('conv_max_state');
    let loaded = null;

    if (savedState) {
        try {
            loaded = JSON.parse(savedState);
        } catch (_) {
            localStorage.removeItem('conv_max_state');
            loaded = null;
        }
    }

    if (loaded && typeof loaded === 'object') {
        state = Object.assign({}, state, loaded);
        if (typeof i18n !== 'undefined' && !i18n[state.lang]) state.lang = 'en';
        if (state.theme !== 'dark' && state.theme !== 'light') state.theme = 'dark';
        if (!Array.isArray(state.favorites)) state.favorites = ['USD', 'EUR', 'RUB', 'UZS', 'BTC'];
        if (!state.rates || typeof state.rates !== 'object') state.rates = {};
        if (typeof state.lastUpdatedTimestamp !== 'number') state.lastUpdatedTimestamp = 0;
    } else {
        const sysLang = navigator.language || navigator.userLanguage || 'en';
        const shortLang = sysLang.split('-')[0].toLowerCase();

        state.lang = (typeof i18n !== 'undefined' && i18n[shortLang]) ? shortLang : 'en';
        state.theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
        saveState();
    }
}

function getCurrencyName(code) {
    if (typeof currencyDb === 'undefined' || !currencyDb[code]) return code;
    const item = currencyDb[code];
    return item.n[state.lang] || item.n['en'] || code;
}

function applyLocalization() {
    if (typeof i18n === 'undefined') return;
    const t = i18n[state.lang] || i18n['en'];
    
    const uiTitle = document.getElementById('ui-title');
    if (uiTitle) uiTitle.textContent = t.title;
    document.title = t.title; 
    
    const metaApple = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (metaApple) metaApple.setAttribute("content", t.title);
    
    const metaAppName = document.querySelector('meta[name="application-name"]');
    if (metaAppName) metaAppName.setAttribute("content", t.title);

    const btnAdd = document.getElementById('ui-add-btn');
    if (btnAdd) btnAdd.textContent = "+ " + t.add;
    
    const modalTitle = document.getElementById('ui-modal-title');
    if (modalTitle) modalTitle.textContent = t.searchTitle;
    
    const btnClose = document.getElementById('ui-close-btn');
    if (btnClose) btnClose.textContent = t.close;
    
    const searchBar = document.getElementById('search-bar');
    if (searchBar) searchBar.placeholder = t.searchPlaceholder;
    
    const langPicker = document.getElementById('lang-picker');
    if (langPicker) langPicker.value = state.lang;
    
    const secAdded = document.getElementById('ui-section-added');
    if (secAdded) secAdded.textContent = t.secAdded;
    
    const secAvail = document.getElementById('ui-section-available');
    if (secAvail) secAvail.textContent = t.secAvailable;

    const hideLabel = document.getElementById('ui-keypad-hide-label');
    if (hideLabel) hideLabel.textContent = t.hideKeypad || 'Скрыть';

    updateOnlineStatusUI(false);
}

function applyTheme() {
    document.body.setAttribute('data-theme', state.theme);
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.textContent = state.theme === 'dark' ? '☀️' : '🌙';
    }
}

function saveState() { 
    state.favorites = [...new Set(state.favorites.filter(c => typeof c === 'string' && c.trim() !== ''))];
    localStorage.setItem('conv_max_state', JSON.stringify(state)); 
}

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

function parseCleanNumber(str) {
    return str.replace(/\s/g, '');
}

function adjustFontSize(input) {
    const len = input.value.length;
    if (len > 16) input.style.fontSize = '0.85rem';
    else if (len > 11) input.style.fontSize = '1.1rem';
    else input.style.fontSize = '1.4rem';
}

function clearAllInputs(e) {
    if (e && (Date.now() - lastKeypadInteractionTime < 450)) {
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
        return;
    }
    currentInputCode = null;
    currentInputValue = '';
    state.favorites.forEach(c => {
        const input = document.getElementById(`input-${c}`);
        const clearBtn = document.getElementById(`clear-${c}`);
        if (input) {
            input.value = '';
            input.style.fontSize = '1.4rem';
        }
        if (clearBtn) clearBtn.classList.remove('visible');
    });
}

// ============================================================
// CALCULATIONS & CONVERSION LOGIC
// ============================================================

function recalculate(activeCode, rawValue) {
    if (!state.rates[activeCode]) return;

    let parsedVal = evaluateMathExpression(rawValue);
    
    if (parsedVal === null) {
        const cleanValue = parseCleanNumber(rawValue);
        parsedVal = parseFloat(cleanValue);
    }

    if (isNaN(parsedVal) || rawValue.trim() === '') {
        state.favorites.forEach(code => {
            if (code !== activeCode) {
                const input = document.getElementById(`input-${code}`);
                const clearBtn = document.getElementById(`clear-${code}`);
                if (input) input.value = '';
                if (clearBtn) clearBtn.classList.remove('visible');
            }
        });
        return;
    }
    
    const valueInUSD = parsedVal / state.rates[activeCode];

    state.favorites.forEach(code => {
        if (code !== activeCode) {
            const input = document.getElementById(`input-${code}`);
            const clearBtn = document.getElementById(`clear-${code}`);
            if (input) {
                if (!state.rates[code]) {
                    input.value = state.lang === 'ru' ? 'Нет курса' : 'No rate';
                    input.style.fontSize = '1rem';
                    return;
                }

                const result = valueInUSD * state.rates[code];
                let digits = 2;
                if (state.rates[code] < 0.001) digits = 6;
                else if (state.rates[code] < 0.1) digits = 4;
                
                const finalVal = parsedVal === 0 ? '' : Number(result.toFixed(digits));
                input.value = finalVal === '' ? '' : formatNumberString(finalVal.toString());
                
                adjustFontSize(input);
                
                if (clearBtn) {
                    if (input.value !== '') clearBtn.classList.add('visible');
                    else clearBtn.classList.remove('visible');
                }
            }
        }
    });
}

// ============================================================
// RENDERING & INTERFACE EVENTS
// ============================================================

function renderMain() {
    const container = document.getElementById('favorites-container');
    if (!container) return;
    
    const fragment = document.createDocumentFragment();

    state.favorites.forEach(code => {
        const dbItem = (typeof currencyDb !== 'undefined' && currencyDb[code]) ? currencyDb[code] : { f: "🏳️" };
        const nameLocal = getCurrencyName(code);
        const card = document.createElement('div');
        card.className = 'currency-card';
        
        const hasRate = !!state.rates[code];
        const placeholderText = hasRate ? '0' : (state.lang === 'ru' ? 'Нет курса' : 'No rate');
        const trendBadgeHTML = '';

        card.innerHTML = `
            <div class="currency-meta">
                <span class="flag">${dbItem.f}</span>
                <div class="code-name">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="c-code">${code}</span>
                        ${trendBadgeHTML}
                    </div>
                    <span class="c-name">${nameLocal}</span>
                </div>
            </div>
            <div class="right-block">
                <input type="text" inputmode="decimal" enterkeyhint="done" class="currency-input" id="input-${code}" placeholder="${placeholderText}" data-code="${code}" autocomplete="off" ${!hasRate ? 'disabled' : ''}>
                <button class="clear-btn" id="clear-${code}">×</button>
            </div>
        `;
        fragment.appendChild(card);
        card.querySelector('.clear-btn').addEventListener('click', clearAllInputs);
    });


    container.innerHTML = '';
    container.appendChild(fragment);

    document.querySelectorAll('.currency-input').forEach(input => {
        // Show virtual keypad on focus or click
        input.addEventListener('focus', (e) => {
            if (!isClosingKeypad) openVirtualKeypad(e.target);
        });

        input.addEventListener('click', (e) => {
            if (!isClosingKeypad) openVirtualKeypad(e.target);
        });

        // 1. User input handler
        input.addEventListener('input', (e) => {
            let raw = e.target.value.replace(/,/g, '.').replace(/\s/g, '');
            let cleanVal = raw.replace(/[^0-9.\+\-\*\/\(\)]/g, ''); 
            
            let formatted = formatExpression(cleanVal);
            e.target.value = formatted;
            
            adjustFontSize(e.target);
            
            currentInputCode = e.target.dataset.code;
            currentInputValue = cleanVal;
            
            const clearBtn = document.getElementById(`clear-${e.target.dataset.code}`);
            if (clearBtn) {
                if (cleanVal !== '') clearBtn.classList.add('visible');
                else clearBtn.classList.remove('visible');
            }

            if (cleanVal.trim() === '') {
                currentInputCode = null;
                currentInputValue = '';
                state.favorites.forEach(c => {
                    if (c !== e.target.dataset.code) {
                        const otherInput = document.getElementById(`input-${c}`);
                        const otherClear = document.getElementById(`clear-${c}`);
                        if (otherInput) { otherInput.value = ''; otherInput.style.fontSize = '1.4rem'; }
                        if (otherClear) otherClear.classList.remove('visible');
                    }
                });
            } else {
                recalculate(e.target.dataset.code, cleanVal);
            }
        });

        // 2. Enter key handler
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyMathResult(e.target);
                closeVirtualKeypad();
                e.target.blur();
            }
        });

        // 3. Blur event handler (only when native keyboard is active)
        input.addEventListener('blur', (e) => {
            if (!useCustomKeypad || !document.body.classList.contains('has-keypad-open')) {
                applyMathResult(e.target);
            }
        });
    });

    
    if (typeof i18n !== 'undefined') {
        const currentT = i18n[state.lang] || i18n['en'];
        const lastUpdateEl = document.getElementById('last-update');
        if (lastUpdateEl) {
            lastUpdateEl.textContent = `${currentT.updated} ${state.lastUpdated || '-'}`;
        }
    }
}

function openModal() { 
    const modal = document.getElementById('search-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        const searchInput = document.getElementById('search-bar');
        if (searchInput) searchInput.focus();
    }
    filterCurrencies(); 
}

function closeModal() { 
    const modal = document.getElementById('search-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        const addBtn = document.getElementById('ui-add-btn');
        if (addBtn) addBtn.focus();
    }
}

function toggleFavorite(code, shouldAdd) {
    if (shouldAdd) {
        if (!state.favorites.includes(code)) state.favorites.push(code);
    } else {
        state.favorites = state.favorites.filter(c => c !== code);
        if (currentInputCode === code) {
            currentInputCode = null;
            currentInputValue = '';
        }
    }
    state.favorites = [...new Set(state.favorites.filter(Boolean))];
    saveState();
    renderMain();
    
    if (currentInputCode && currentInputValue !== '') {
        const activeInput = document.getElementById(`input-${currentInputCode}`);
        if (activeInput) {
            activeInput.value = currentInputValue;
            adjustFontSize(activeInput);
            const clearBtn = document.getElementById(`clear-${currentInputCode}`);
            if (clearBtn) clearBtn.classList.add('visible');
            recalculate(currentInputCode, currentInputValue);
        }
    }
    
    filterCurrencies();
}

function matchesQuery(code, dbItem, query) {
    if (!query) return true;
    if (code.toLowerCase().includes(query)) return true;
    if (dbItem && dbItem.n) {
        for (const lang in dbItem.n) {
            if (dbItem.n[lang].toLowerCase().includes(query)) return true;
        }
    }
    return false;
}

function filterCurrencies() {
    const searchBar = document.getElementById('search-bar');
    if (!searchBar || typeof currencyDb === 'undefined') return;
    
    const query = searchBar.value.toLowerCase().trim();
    const addedContainer = document.getElementById('added-container');
    const availableContainer = document.getElementById('available-container');
    
    if (!addedContainer || !availableContainer) return;

    const addedFragment = document.createDocumentFragment();
    const availableFragment = document.createDocumentFragment();

    state.favorites = [...new Set(state.favorites.filter(Boolean))];

    state.favorites.forEach(code => {
        const dbItem = currencyDb[code];
        if (!dbItem) return;
        const nameLocal = getCurrencyName(code);
        if (!matchesQuery(code, dbItem, query)) return;

        const item = document.createElement('div');
        item.className = 'search-item';
        item.dataset.code = code;
        item.draggable = true; 
        item.innerHTML = `
            <div class="search-item-left">
                <span class="drag-handle">☰</span>
                <div class="currency-meta" style="flex-grow:1;">
                    <span class="flag">${dbItem.f}</span>
                    <div class="code-name">
                        <span class="c-code">${code}</span>
                        <span class="c-name">${nameLocal}</span>
                    </div>
                </div>
            </div>
            <span class="action-icon" style="color:#ff453a; user-select:none;">−</span>
        `;
        item.querySelector('.action-icon').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(code, false);
        });
        addedFragment.appendChild(item);
    });

    Object.keys(currencyDb).forEach(code => {
        if (state.favorites.includes(code)) return; 
        const dbItem = currencyDb[code];
        const nameLocal = getCurrencyName(code);
        if (!matchesQuery(code, dbItem, query)) return;

        const item = document.createElement('div');
        const hasRate = !!state.rates[code];
        item.className = `search-item clickable ${!hasRate ? 'no-rate-available' : ''}`;
        
        const badgeHTML = hasRate ? '' : `<span style="font-size:0.7rem; background: var(--border); padding:2px 6px; border-radius:4px; margin-right:8px; color:var(--text-muted)">?</span>`;

        item.innerHTML = `
            <div class="currency-meta">
                <span class="flag">${dbItem.f}</span>
                <div class="code-name">
                    <span class="c-code">${code}</span>
                    <span class="c-name">${nameLocal}</span>
                </div>
            </div>
            <div style="display:flex; align-items:center;">
                ${badgeHTML}
                <span class="action-icon" style="color:var(--accent);">+</span>
            </div>
        `;
        item.addEventListener('click', () => toggleFavorite(code, true));
        availableFragment.appendChild(item);
    });

    addedContainer.innerHTML = '';
    addedContainer.appendChild(addedFragment);

    availableContainer.innerHTML = '';
    availableContainer.appendChild(availableFragment);
}

// ============================================================
// DRAG & DROP
// ============================================================

function setupDragAndDropHandlers() {
    const container = document.getElementById('added-container');
    if (!container) return;
    
    let dragEl = null;
    let activeTouchEl = null;

    container.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.search-item');
        if (item) { dragEl = item; setTimeout(() => item.classList.add('dragging'), 0); }
    });

    container.addEventListener('dragend', (e) => {
        const item = e.target.closest('.search-item');
        if (item) { item.classList.remove('dragging'); saveNewOrder(); }
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!dragEl) return;
        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) container.appendChild(dragEl);
        else container.insertBefore(dragEl, afterElement);
    });

    container.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('drag-handle')) {
            const item = e.target.closest('.search-item');
            if (item) { activeTouchEl = item; item.classList.add('dragging'); }
        }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!activeTouchEl) return;
        e.preventDefault(); 
        const touch = e.touches[0];
        const afterElement = getDragAfterElement(container, touch.clientY);
        if (afterElement == null) container.appendChild(activeTouchEl);
        else container.insertBefore(activeTouchEl, afterElement);
    }, { passive: false });

    container.addEventListener('touchend', () => {
        if (activeTouchEl) { activeTouchEl.classList.remove('dragging'); activeTouchEl = null; saveNewOrder(); }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.search-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const childCenter = box.top + box.height / 2;
        if (y < childCenter) {
            const offset = y - box.top - (box.height * 0.25);
            if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
        } else {
            const offset = y - box.top - (box.height * 0.75);
            if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function saveNewOrder() {
    const currentOrder = [];
    document.querySelectorAll('#added-container .search-item').forEach(item => {
        if (item.dataset.code) currentOrder.push(item.dataset.code);
    });
    const uniqueVisibleOrder = [...new Set(currentOrder)].filter(c => typeof c === 'string' && c.trim() !== '');
    const visibleSet = new Set(uniqueVisibleOrder);
    const nonVisibleFavs = state.favorites.filter(code => !visibleSet.has(code));
    
    state.favorites = [...uniqueVisibleOrder, ...nonVisibleFavs];
    saveState();
    renderMain();

    if (currentInputCode && currentInputValue !== '') {
        const activeInput = document.getElementById(`input-${currentInputCode}`);
        if (activeInput) {
            activeInput.value = currentInputValue;
            adjustFontSize(activeInput);
            recalculate(currentInputCode, currentInputValue);
        }
    }
}

// ============================================================
// EXCHANGE RATES FETCHING & UPDATES
// ============================================================

async function fetchFiatRates() {
    let lastError = null;
    
    for (const url of FIAT_API_URLS) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            
            if (data && data.rates) {
                let rates = { ...data.rates };
                if (!rates['USD']) {
                    rates['USD'] = 1;
                }
                return rates;
            }
        } catch (e) {
            console.warn(`Не удалось загрузить данные из источника ${url}:`, e);
            lastError = e;
        }
    }
    throw lastError || new Error("All fiat currency rate sources are unavailable");
}

async function updateRates(forceUpdate = false) {
    const now = Date.now();
    
    // Check connectivity first
    await updateOnlineStatusUI(false);

    // Check cache freshness
    if (!forceUpdate && Object.keys(state.rates).length > 0 && (now - state.lastUpdatedTimestamp < CACHE_DURATION)) {
        console.log("Using cached exchange rates");
        return;
    }

    // Show syncing indicator
    await updateOnlineStatusUI(true);

    try {
        let newRates = await fetchFiatRates();

        if (typeof currencyDb !== 'undefined') {
            const cryptoIds = Object.values(currencyDb).filter(item => item.id).map(item => item.id);
            if (cryptoIds.length > 0) {
                try {
                    const resCrypto = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds.join(',')}&vs_currencies=usd`);
                    if (resCrypto.ok) {
                        const dataCrypto = await resCrypto.json();
                        Object.keys(currencyDb).forEach(code => {
                            const apiId = currencyDb[code].id;
                            if (apiId && dataCrypto && dataCrypto[apiId] && dataCrypto[apiId].usd) {
                                newRates[code] = 1 / dataCrypto[apiId].usd;
                            }
                        });
                    }
                } catch (cryptoErr) {
                    console.warn("Cryptocurrency rates update failed:", cryptoErr);
                }
            }
        }

        state.rates = newRates;
        state.lastUpdatedTimestamp = now;
        state.lastUpdated = new Date().toLocaleString();
        
        saveState();
        await updateOnlineStatusUI(false);
    } catch (e) {
        console.error("Exchange rates update error:", e);
        await updateOnlineStatusUI(false);
    } finally {
        // Re-render DOM only if input is not focused and virtual keypad is not active
        const activeEl = document.activeElement;
        const isInputFocused = activeEl && activeEl.classList.contains('currency-input');
        const isKeypadOpen = document.body.classList.contains('has-keypad-open') || activeInputEl !== null || currentInputCode !== null;

        if (!isInputFocused && !isKeypadOpen) {
            renderMain();
        }
        
        if (currentInputCode && currentInputValue !== '') {
            recalculate(currentInputCode, currentInputValue);
        }
    }
}

// ============================================================
// PWA & SYSTEM SETTINGS
// ============================================================

function updatePWAManifest() {
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', state.theme === 'dark' ? '#1c1c1e' : '#f2f2f7');
    }
}

// PAGE EVENT LISTENERS
const langPicker = document.getElementById('lang-picker');
if (langPicker) {
    langPicker.addEventListener('change', (e) => {
        state.lang = e.target.value;
        applyLocalization();
        renderMain();
        if (currentInputCode && currentInputValue !== '') {
            recalculate(currentInputCode, currentInputValue);
        }
        updatePWAManifest();
        saveState();
    });
}

const themeBtn = document.getElementById('theme-btn');
if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        applyTheme();
        updatePWAManifest();
        saveState();
    });
}

const addBtn = document.getElementById('ui-add-btn');
if (addBtn) addBtn.addEventListener('click', openModal);

const closeBtn = document.getElementById('ui-close-btn');
if (closeBtn) closeBtn.addEventListener('click', closeModal);

const searchBar = document.getElementById('search-bar');
if (searchBar) searchBar.addEventListener('input', filterCurrencies);

window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('search-modal')) closeModal();
    if (e.target === document.getElementById('chart-modal')) closeChartModal();
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('search-modal');
        if (modal && modal.style.display === 'flex') closeModal();
        const chartModal = document.getElementById('chart-modal');
        if (chartModal && chartModal.style.display === 'flex') closeChartModal();
    }
});

const chartCloseBtn = document.getElementById('chart-close-btn');
if (chartCloseBtn) chartCloseBtn.addEventListener('click', closeChartModal);

document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        triggerHaptic(10);
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        chartActivePeriod = e.target.dataset.period;
        
        const t = (typeof i18n !== 'undefined' && i18n[state.lang]) ? i18n[state.lang] : i18n['en'];
        const lblChange = document.getElementById('lbl-chart-change');
        if (lblChange) lblChange.textContent = `${t.change || 'Change'} (${chartActivePeriod.toUpperCase()})`;

        updateChartData();
    });
});

window.addEventListener('online', () => updateRates(true));
window.addEventListener('offline', () => updateOnlineStatusUI(false));


// ============================================================
// KEYPAD EVENT LISTENERS
// ============================================================

document.querySelectorAll('.key-btn').forEach(btn => {
    const handlePress = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const key = btn.dataset.key;
        handleKeypadPress(key);
    };

    btn.addEventListener('pointerdown', handlePress);
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});

const keypadCloseBtn = document.getElementById('keypad-close');
if (keypadCloseBtn) {
    const handleClose = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeVirtualKeypad();
    };
    keypadCloseBtn.addEventListener('pointerdown', handleClose);
    keypadCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
}

const keypadHideBtn = document.getElementById('keypad-hide-btn');
if (keypadHideBtn) {
    const handleHide = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeVirtualKeypad();
    };
    keypadHideBtn.addEventListener('pointerdown', handleHide);
    keypadHideBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
}

const keypadToggleBtn = document.getElementById('keypad-toggle-mode');
if (keypadToggleBtn) {
    keypadToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleKeypadMode();
    });
}

// Close keypad when clicking outside input fields, cards, or keypad
document.addEventListener('pointerdown', (e) => {
    if (!document.body.classList.contains('has-keypad-open') || isClosingKeypad) return;
    
    const target = e.target;
    if (
        !target.closest('#virtual-keypad') &&
        !target.closest('.currency-card') &&
        !target.closest('#search-modal') &&
        !target.closest('header')
    ) {
        closeVirtualKeypad();
    }
});

// ============================================================
// APPLICATION INITIALIZATION
// ============================================================


initSystemSettings();
applyLocalization();
applyTheme();
updatePWAManifest();
setupDragAndDropHandlers();

// Instant initial render from cache
renderMain();

// Fetch live rates update if cache is expired
updateRates(false);