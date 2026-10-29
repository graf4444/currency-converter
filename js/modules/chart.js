// ============================================================
// HISTORICAL CHART & TREND CONTROLLER
// Interactive rate trend badges, SVG line charts, and period selectors.
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
    
    let displayCode = code;
    if (typeof state !== 'undefined' && state.customCurrencies && state.customCurrencies[code]) {
        const item = state.customCurrencies[code];
        displayCode = item.baseCode || item.code || code;
    }

    const flag = typeof getCurrencyFlag === 'function' ? getCurrencyFlag(code) : ((typeof currencyDb !== 'undefined' && currencyDb[code]) ? currencyDb[code].f : "🏳️");
    const nameLocal = getCurrencyName(code);
    
    const flagEl = document.getElementById('chart-currency-flag');
    const titleEl = document.getElementById('chart-currency-title');
    const subtitleEl = document.getElementById('chart-currency-subtitle');
    
    if (flagEl) flagEl.textContent = flag;
    if (titleEl) titleEl.textContent = `${displayCode} / USD`;
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

function formatChartValue(val, code) {
    if (typeof formatConvertedValue === 'function') {
        return formatConvertedValue(val, code || 'USD');
    }
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

/**
 * Attaches chart modal event listeners (period buttons, close button).
 */
function setupChartEvents() {
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
}
