// ============================================================
// КОНФИГУРАЦИЯ И СОСТОЯНИЕ
// ============================================================

// Массив приоритетных API для фиатных валют (без ключей)
const FIAT_API_URLS = [
    "https://api.exchangerate.fun/latest?base=USD",
    "https://api.frankfurter.app/latest?from=USD",
    "https://open.er-api.com/v6/latest/USD"
];

// Время жизни кэша в миллисекундах (1 час)
const CACHE_DURATION = 60 * 60 * 1000;

let state = {
    theme: 'dark', 
    lang: 'en',
    rates: {}, 
    favorites: ['USD', 'EUR', 'RUB', 'UZS', 'BTC'],
    lastUpdated: '',
    lastUpdatedTimestamp: 0
};

// Хранилище активного ввода пользователя
let currentInputCode = null;
let currentInputValue = '';

// ============================================================
// ПРОВЕРКА СЕТИ, ВСПРАВЛЕНИЕ ОФЛАЙН-СТАТУСА И КАЛЬКУЛЯТОР
// ============================================================

// Реальная проверка наличия интернета (не верит "слепому" navigator.onLine)
async function checkRealOnlineStatus() {
    if (!navigator.onLine) return false;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 сек тайм-аут

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

// Управление статусом в шапке (Online / Offline / Syncing)
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

// Безопасный парсер математических выражений (без eval)
function evaluateMathExpression(expr) {
    if (!expr) return null;
    
    let clean = expr.replace(/\s+/g, '').replace(/,/g, '.');
    if (!/^[0-9.+\-*/()]+$/.test(clean)) return null;

    try {
        const result = new Function(`'use strict'; return (${clean})`)();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
            return result;
        }
    } catch (_) {
        return null; 
    }
    return null;
}

// Применяет итоговый результат математического вычисления к инпуту (по Enter или Blur)
function applyMathResult(input) {
    if (!input) return;
    
    const code = input.dataset.code;
    const rawValue = input.value;
    
    const calculated = evaluateMathExpression(rawValue);
    
    if (calculated !== null) {
        const formatted = formatNumberString(calculated.toString());
        input.value = formatted;
        
        currentInputCode = code;
        currentInputValue = calculated.toString();
        
        adjustFontSize(input);
        recalculate(code, calculated.toString());
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

function formatNumberString(str) {
    if (!str) return '';
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join('.');
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

function clearAllInputs() {
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
// РАСЧЕТ И КОНВЕРТАЦИЯ
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
// РЕНДЕРИНГ И СОБЫТИЯ ИНТЕРФЕЙСА
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

        card.innerHTML = `
            <div class="currency-meta">
                <span class="flag">${dbItem.f}</span>
                <div class="code-name">
                    <span class="c-code">${code}</span>
                    <span class="c-name">${nameLocal}</span>
                </div>
            </div>
            <div class="right-block">
                <input type="text" inputmode="text" enterkeyhint="done" class="currency-input" id="input-${code}" placeholder="${placeholderText}" data-code="${code}" autocomplete="off" ${!hasRate ? 'disabled' : ''}>
                <button class="clear-btn" id="clear-${code}">×</button>
            </div>
        `;
        fragment.appendChild(card);
        card.querySelector('.clear-btn').addEventListener('click', clearAllInputs);
    });

    container.innerHTML = '';
    container.appendChild(fragment);

    document.querySelectorAll('.currency-input').forEach(input => {
        // 1. Ввод
        input.addEventListener('input', (e) => {
            let val = e.target.value.replace(/,/g, '.').replace(/[^0-9. \+\-\*\/\(\)]/g, ''); 
            
            e.target.value = val;
            adjustFontSize(e.target);
            
            currentInputCode = e.target.dataset.code;
            currentInputValue = val;
            
            const clearBtn = document.getElementById(`clear-${e.target.dataset.code}`);
            if (clearBtn) {
                if (e.target.value !== '') clearBtn.classList.add('visible');
                else clearBtn.classList.remove('visible');
            }

            if (val.trim() === '') {
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
                recalculate(e.target.dataset.code, val);
            }
        });

        // 2. Enter или кнопка "Готово" на клаве
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyMathResult(e.target);
                e.target.blur();
            }
        });

        // 3. Потеря фокуса
        input.addEventListener('blur', (e) => {
            applyMathResult(e.target);
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
    if (modal) modal.style.display = 'flex'; 
    filterCurrencies(); 
}

function closeModal() { 
    const modal = document.getElementById('search-modal');
    if (modal) modal.style.display = 'none'; 
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
// ЗАГРУЗКА И ОБНОВЛЕНИЕ КУРСОВ
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
    throw lastError || new Error("Все источники фиатных валют недоступны");
}

async function updateRates(forceUpdate = false) {
    const now = Date.now();
    
    // Сначала проверяем соединение
    await updateOnlineStatusUI(false);

    // Проверка кэша
    if (!forceUpdate && Object.keys(state.rates).length > 0 && (now - state.lastUpdatedTimestamp < CACHE_DURATION)) {
        console.log("Используются актуальные курсы из локального кэша");
        return;
    }

    // Включаем индикатор "Синхронизация..."
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
                    console.warn("Криптовалюты не обновлены:", cryptoErr);
                }
            }
        }

        state.rates = newRates;
        state.lastUpdatedTimestamp = now;
        state.lastUpdated = new Date().toLocaleString();
        
        saveState();
        await updateOnlineStatusUI(false);
    } catch (e) {
        console.error("Ошибка обновления курсов:", e);
        await updateOnlineStatusUI(false);
    } finally {
        // Перерисовываем DOM только если нет фокуса на инпуте
        const activeEl = document.activeElement;
        const isInputFocused = activeEl && activeEl.classList.contains('currency-input');

        if (!isInputFocused) {
            renderMain();
        }
        
        if (currentInputCode && currentInputValue !== '') {
            recalculate(currentInputCode, currentInputValue);
        }
    }
}

// ============================================================
// PWA И СИСТЕМНЫЕ НАСТРОЙКИ
// ============================================================

function updatePWAManifest() {
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', state.theme === 'dark' ? '#1c1c1e' : '#f2f2f7');
    }
}

// СЛУШАТЕЛИ СОБЫТИЙ СТРАНИЦЫ
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
});

window.addEventListener('online', () => updateRates(true));
window.addEventListener('offline', () => updateOnlineStatusUI(false));

// ============================================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ============================================================

initSystemSettings();
applyLocalization();
applyTheme();
updatePWAManifest();
setupDragAndDropHandlers();

// Быстрый рендер из кэша
renderMain();

// Запрос обновлений (сработает при необходимости)
updateRates(false);