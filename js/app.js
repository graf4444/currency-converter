const API_URL = "https://open.er-api.com/v6/latest/USD";

let state = {
    theme: 'dark', lang: 'en',
    rates: {}, // Изначально пустой объект курсов
    favorites: ['USD', 'EUR', 'RUB', 'UZS', 'BTC'],
    lastUpdated: ''
};

// Хранилище активного ввода пользователя для предотвращения сброса данных при добавлении валют
let currentInputCode = null;
let currentInputValue = '';

function initSystemSettings() {
    const savedState = localStorage.getItem('conv_max_state');
    let loaded = null;

    if (savedState) {
        try {
            loaded = JSON.parse(savedState);
        } catch (_) {
            // Corrupted storage — drop it and fall back to defaults.
            localStorage.removeItem('conv_max_state');
            loaded = null;
        }
    }

    if (loaded && typeof loaded === 'object') {
        // Merge defensively so missing fields from older versions don't crash render.
        state = Object.assign({}, state, loaded);
        if (!i18n[state.lang]) state.lang = 'en';
        if (state.theme !== 'dark' && state.theme !== 'light') state.theme = 'dark';
        if (!Array.isArray(state.favorites)) state.favorites = ['USD', 'EUR', 'RUB', 'UZS', 'BTC'];
        if (!state.rates || typeof state.rates !== 'object') state.rates = {};
    } else {
        const sysLang = navigator.language || navigator.userLanguage || 'en';
        const shortLang = sysLang.split('-')[0].toLowerCase();

        state.lang = i18n[shortLang] ? shortLang : 'en';
        state.theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
        saveState();
    }
}

function getCurrencyName(code) {
    const item = currencyDb[code];
    if (!item) return code;
    return item.n[state.lang] || item.n['en'] || code;
}

function applyLocalization() {
    const t = i18n[state.lang] || i18n['en'];
    document.getElementById('ui-title').textContent = t.title;
    document.title = t.title; 
    
    document.querySelector('meta[name="apple-mobile-web-app-title"]').setAttribute("content", t.title);
    document.querySelector('meta[name="application-name"]').setAttribute("content", t.title);

    document.getElementById('ui-add-btn').textContent = "+ " + t.add;
    document.getElementById('ui-modal-title').textContent = t.searchTitle;
    document.getElementById('ui-close-btn').textContent = t.close;
    document.getElementById('search-bar').placeholder = t.searchPlaceholder;
    document.getElementById('lang-picker').value = state.lang;
    document.getElementById('ui-section-added').textContent = t.secAdded;
    document.getElementById('ui-section-available').textContent = t.secAvailable;

    const status = document.getElementById('sync-status');
    const loader = document.getElementById('loader');
    
    if (loader.style.display === 'inline-block') {
        status.textContent = t.sync; // Если сейчас идет загрузка
    } else {
        status.textContent = navigator.onLine ? t.online : t.offline;
    }
}

function applyTheme() {
    document.body.setAttribute('data-theme', state.theme);
    document.getElementById('theme-btn').textContent = state.theme === 'dark' ? '☀️' : '🌙';
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

function recalculate(activeCode, rawValue) {
    const cleanValue = parseCleanNumber(rawValue);
    
    // Если у активной валюты нет курса, расчет невозможен
    if (!state.rates[activeCode]) return;

    if (cleanValue === '' || isNaN(cleanValue)) {
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
    
    const valueInUSD = parseFloat(cleanValue) / state.rates[activeCode];

    state.favorites.forEach(code => {
        if (code !== activeCode) {
            const input = document.getElementById(`input-${code}`);
            const clearBtn = document.getElementById(`clear-${code}`);
            if (input) {
                // Если для какой-то из выбранных валют нет курса, помечаем её вводом "No rate"
                if (!state.rates[code]) {
                    input.value = state.lang === 'ru' ? 'Нет курса' : 'No rate';
                    input.style.fontSize = '1rem';
                    return;
                }

                const result = valueInUSD * state.rates[code];
                let digits = 2;
                if (state.rates[code] < 0.001) digits = 6;
                else if (state.rates[code] < 0.1) digits = 4;
                
                const finalVal = parseFloat(cleanValue) === 0 ? '' : Number(result.toFixed(digits));
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

function renderMain() {
    const container = document.getElementById('favorites-container');
    
    // Используем DocumentFragment, чтобы избежать мерцания при построении главного списка
    const fragment = document.createDocumentFragment();

    state.favorites.forEach(code => {
        const dbItem = currencyDb[code] || { f: "🏳️" };
        const nameLocal = getCurrencyName(code);
        const card = document.createElement('div');
        card.className = 'currency-card';
        
        // Проверяем наличие курса, если его нет — кастомизируем плейсхолдер
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
                <input type="text" inputmode="decimal" class="currency-input" id="input-${code}" placeholder="${placeholderText}" data-code="${code}" autocomplete="off" ${!hasRate ? 'disabled' : ''}>
                <button class="clear-btn" id="clear-${code}">×</button>
            </div>
        `;
        fragment.appendChild(card);
        card.querySelector('.clear-btn').addEventListener('click', clearAllInputs);
    });

    container.innerHTML = '';
    container.appendChild(fragment);

    // Вешаем обработчики заново на новые элементы
    document.querySelectorAll('.currency-input').forEach(input => {
        input.addEventListener('input', (e) => {
            let val = e.target.value.replace(/,/g, '.').replace(/[^0-9. ]/g, ''); 
            let clean = parseCleanNumber(val).replace(/^0+(?=\d)/, '');
            
            const parts = clean.split('.');
            if (parts.length > 2) clean = parts[0] + '.' + parts.slice(1).join('');
            
            e.target.value = clean !== '' ? formatNumberString(clean) : '';
            adjustFontSize(e.target);
            
            currentInputCode = e.target.dataset.code;
            currentInputValue = clean;
            
            const clearBtn = document.getElementById(`clear-${e.target.dataset.code}`);
            if (clearBtn) {
                if (e.target.value !== '') clearBtn.classList.add('visible');
                else clearBtn.classList.remove('visible');
            }

            if (clean === '') {
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
                recalculate(e.target.dataset.code, clean);
            }
        });
    });
    
    const currentT = i18n[state.lang] || i18n['en'];
    document.getElementById('last-update').textContent = `${currentT.updated} ${state.lastUpdated || '-'}`;
}

function openModal() { 
    document.getElementById('search-modal').style.display = 'flex'; 
    filterCurrencies(); 
}

function closeModal() { 
    document.getElementById('search-modal').style.display = 'none'; 
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
            activeInput.value = formatNumberString(currentInputValue);
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

// Прокачанная функция фильтрации без эффекта мерцания (используем фрагменты памяти)
function filterCurrencies() {
    const query = document.getElementById('search-bar').value.toLowerCase().trim();
    const addedContainer = document.getElementById('added-container');
    const availableContainer = document.getElementById('available-container');
    
    // Создаем фрагменты для сборки структуры в памяти процессора
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
        
        // Помечаем визуально валюты, для которых нет курса в текущей сессии
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

    // Мгновенная атомарная замена в DOM — старый список исчезает, новый появляется без моргания
    addedContainer.innerHTML = '';
    addedContainer.appendChild(addedFragment);

    availableContainer.innerHTML = '';
    availableContainer.appendChild(availableFragment);
}

function setupDragAndDropHandlers() {
    const container = document.getElementById('added-container');
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
            activeInput.value = formatNumberString(currentInputValue);
            adjustFontSize(activeInput);
            recalculate(currentInputCode, currentInputValue);
        }
    }
}

async function updateRates() {
    const loader = document.getElementById('loader');
    const status = document.getElementById('sync-status');
    loader.style.display = 'inline-block';
    const currentT = i18n[state.lang] || i18n['en'];
    status.textContent = currentT.sync;

    try {
        const resFiat = await fetch(API_URL);
        const dataFiat = await resFiat.json();
        let newRates = { ...dataFiat.rates };

        const cryptoIds = Object.values(currencyDb).filter(item => item.id).map(item => item.id);
        if (cryptoIds.length > 0) {
            const resCrypto = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds.join(',')}&vs_currencies=usd`);
            const dataCrypto = await resCrypto.json();
            Object.keys(currencyDb).forEach(code => {
                const apiId = currencyDb[code].id;
                if (apiId && dataCrypto && dataCrypto[apiId]) {
                    newRates[code] = 1 / dataCrypto[apiId].usd;
                }
            });
        }

        state.rates = newRates;
        state.lastUpdated = new Date().toLocaleString();
        status.textContent = currentT.online;
        saveState();
    } catch (e) {
        status.textContent = currentT.offline;
    } finally {
        loader.style.display = 'none';
        
        // Перерисовываем главный список, теперь с настоящими курсами валют
        renderMain();
        
        if (currentInputCode && currentInputValue !== '') {
            recalculate(currentInputCode, currentInputValue);
        }
    }
}

document.getElementById('lang-picker').addEventListener('change', (e) => {
    state.lang = e.target.value;
    applyLocalization();
    renderMain();
    if (currentInputCode && currentInputValue !== '') {
        recalculate(currentInputCode, currentInputValue);
    }
    updatePWAManifest();
    saveState();
});

document.getElementById('theme-btn').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    updatePWAManifest();
    saveState();
});

document.getElementById('ui-add-btn').addEventListener('click', openModal);
document.getElementById('ui-close-btn').addEventListener('click', closeModal);
document.getElementById('search-bar').addEventListener('input', filterCurrencies);

window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('search-modal')) closeModal();
});

window.addEventListener('online', updateRates);
window.addEventListener('offline', () => {
    const currentT = i18n[state.lang] || i18n['en'];
    document.getElementById('sync-status').textContent = currentT.offline;
});

// ИНИЦИАЛИЗАЦИЯ: Очередность изменена для исключения моргания
initSystemSettings();
applyLocalization();
applyTheme();
updatePWAManifest();
setupDragAndDropHandlers();

// Сначала рендерим пустой статичный список из локальных констант (мгновенно)
renderMain();

// И только потом асинхронно идем в сеть обновлять курсы валют
updateRates();
