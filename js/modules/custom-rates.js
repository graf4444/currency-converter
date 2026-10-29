// ============================================================
// CUSTOM / PURCHASED RATE ENGINE (LIGHTWEIGHT & MINIMAL)
// Enables locking user-purchased cash exchange rates and creating
// custom local currencies with clean, native UI.
// ============================================================

let currentEditCustomId = null;

function triggerCustomToast(msg) {
    if (typeof showToast === 'function') {
        showToast(msg);
    }
}

function getCustomI18n(key, fallback = '') {
    if (typeof i18n !== 'undefined' && state && state.lang && i18n[state.lang] && i18n[state.lang][key]) {
        return i18n[state.lang][key];
    }
    if (typeof i18n !== 'undefined' && i18n['en'] && i18n['en'][key]) {
        return i18n['en'][key];
    }
    if (typeof i18n !== 'undefined' && i18n['ru'] && i18n['ru'][key]) {
        return i18n['ru'][key];
    }
    return fallback;
}

/**
 * Gets sorted list of available currencies (favorites/popular first, then rest).
 */
function getSortedCurrencyCodes() {
    if (typeof currencyDb === 'undefined') return [];
    const favSet = new Set(state.favorites || ['USD', 'EUR', 'RUB']);
    const allCodes = Object.keys(currencyDb);
    return [
        ...allCodes.filter(c => favSet.has(c)),
        ...allCodes.filter(c => !favSet.has(c))
    ];
}

/**
 * Returns flag and name info for a currency code.
 */
function getPickerItemMeta(code) {
    if (code === '__NEW__') {
        const newCodeInput = document.getElementById('new-curr-code');
        const newNameInput = document.getElementById('new-curr-name');
        const customCode = (newCodeInput && newCodeInput.value.trim().toUpperCase()) || 'NEW';
        const customName = (newNameInput && newNameInput.value.trim()) || (state.lang === 'ru' ? 'Своя валюта (баллы, мили...)' : 'Other custom currency');
        return {
            code: customCode,
            flag: '➕',
            name: customName
        };
    }
    const item = (typeof currencyDb !== 'undefined' && currencyDb[code]) ? currencyDb[code] : { f: '💵' };
    const name = (item.n && (item.n[state.lang] || item.n['en'])) || code;
    return {
        code,
        flag: item.f || '💵',
        name
    };
}

/**
 * Selects a currency in the searchable picker and updates UI.
 */
function selectPickerCurrency(type, code, updateHint = true) {
    const hiddenSelect = document.getElementById(`custom-${type}-select`);
    if (hiddenSelect) hiddenSelect.value = code;

    const flagEl = document.getElementById(`${type}-picker-flag`);
    const codeEl = document.getElementById(`${type}-picker-code`);
    const nameEl = document.getElementById(`${type}-picker-name`);

    const meta = getPickerItemMeta(code);
    if (flagEl) flagEl.textContent = meta.flag;
    if (codeEl) codeEl.textContent = meta.code;
    if (nameEl) nameEl.textContent = meta.name;

    closePicker(type);

    if (updateHint) {
        updateMarketRateHint();
    }
}

/**
 * Renders filtered list items inside the picker dropdown.
 */
function renderPickerList(type, query = '') {
    const listEl = document.getElementById(`${type}-picker-list`);
    const hiddenSelect = document.getElementById(`custom-${type}-select`);
    if (!listEl) return;

    const currentVal = hiddenSelect ? hiddenSelect.value : (type === 'base' ? 'USD' : 'RUB');
    const sortedCodes = getSortedCurrencyCodes();
    const q = (query || '').toLowerCase().trim();

    let itemsToRender = [];

    sortedCodes.forEach(code => {
        const item = currencyDb[code];
        if (!item) return;
        const nameLocal = (item.n && item.n[state.lang]) ? item.n[state.lang].toLowerCase() : '';
        const nameEn = (item.n && item.n['en']) ? item.n['en'].toLowerCase() : '';
        const codeLower = code.toLowerCase();

        if (!q || codeLower.includes(q) || nameLocal.includes(q) || nameEn.includes(q)) {
            itemsToRender.push(code);
        }
    });

    let newCurrencyMatched = false;
    if (type === 'base') {
        if (!q || q.includes('нов') || q.includes('сво') || q.includes('new') || q.includes('cust') || q.includes('балл') || q.includes('мил') || q.includes('pts') || q.includes('point')) {
            newCurrencyMatched = true;
        }
    }

    if (itemsToRender.length === 0 && !newCurrencyMatched) {
        listEl.innerHTML = `<div class="picker-empty">${state.lang === 'ru' ? 'Ничего не найдено' : 'No currencies found'}</div>`;
        return;
    }

    let html = itemsToRender.map(code => {
        const meta = getPickerItemMeta(code);
        const isSelected = code === currentVal;
        return `
            <div class="picker-item ${isSelected ? 'is-selected' : ''}" data-code="${code}" role="option" aria-selected="${isSelected}">
                <span class="picker-item-flag">${meta.flag}</span>
                <span class="picker-item-code">${meta.code}</span>
                <span class="picker-item-sep">—</span>
                <span class="picker-item-name">${escapeHTML(meta.name)}</span>
                ${isSelected ? '<span class="picker-item-check">✓</span>' : ''}
            </div>
        `;
    }).join('');

    if (newCurrencyMatched) {
        const isSelected = currentVal === '__NEW__';
        const meta = getPickerItemMeta('__NEW__');
        html += `
            <div class="picker-item ${isSelected ? 'is-selected' : ''}" data-code="__NEW__" role="option" aria-selected="${isSelected}">
                <span class="picker-item-flag">${meta.flag}</span>
                <span class="picker-item-code">${meta.code}</span>
                <span class="picker-item-sep">—</span>
                <span class="picker-item-name">${escapeHTML(meta.name)}</span>
                ${isSelected ? '<span class="picker-item-check">✓</span>' : ''}
            </div>
        `;
    }

    listEl.innerHTML = html;

    listEl.querySelectorAll('.picker-item').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const code = el.dataset.code;
            selectPickerCurrency(type, code);
            triggerHaptic(10);
            if (type === 'base' && code === '__NEW__') {
                const newCodeInput = document.getElementById('new-curr-code');
                if (newCodeInput) newCodeInput.focus();
            }
        });
    });
}

/**
 * Opens picker dropdown with autofocus on search input.
 */
function openPicker(type) {
    const otherType = type === 'base' ? 'target' : 'base';
    closePicker(otherType);

    const dropdown = document.getElementById(`${type}-picker-dropdown`);
    const btn = document.getElementById(`custom-${type}-btn`);
    const searchInput = document.getElementById(`${type}-picker-search`);

    if (!dropdown || !btn) return;

    dropdown.hidden = false;
    btn.setAttribute('aria-expanded', 'true');

    if (searchInput) {
        searchInput.value = '';
    }
    renderPickerList(type, '');

    setTimeout(() => {
        if (searchInput) searchInput.focus();
        const selectedItem = dropdown.querySelector('.picker-item.is-selected');
        if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest' });
        }
    }, 40);
}

/**
 * Closes picker dropdown.
 */
function closePicker(type) {
    if (!type) {
        closePicker('base');
        closePicker('target');
        return;
    }
    const dropdown = document.getElementById(`${type}-picker-dropdown`);
    const btn = document.getElementById(`custom-${type}-btn`);
    if (dropdown) dropdown.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
}

/**
 * Toggles picker dropdown open/closed.
 */
function togglePicker(type) {
    const dropdown = document.getElementById(`${type}-picker-dropdown`);
    if (!dropdown) return;
    if (dropdown.hidden) {
        openPicker(type);
    } else {
        closePicker(type);
    }
}

/**
 * Populates base and target currency dropdowns cleanly.
 */
function populateCustomRateSelects() {
    const sortedCodes = getSortedCurrencyCodes();
    const baseSelect = document.getElementById('custom-base-select');
    const targetSelect = document.getElementById('custom-target-select');

    if (!baseSelect || !targetSelect) return;

    let baseHTML = sortedCodes.map(code => `<option value="${code}">${code}</option>`).join('');
    baseHTML += `<option value="__NEW__">NEW</option>`;

    let targetHTML = sortedCodes.map(code => `<option value="${code}">${code}</option>`).join('');

    baseSelect.innerHTML = baseHTML;
    targetSelect.innerHTML = targetHTML;
}

/**
 * Determines default target currency relative to base.
 */
function getSmartDefaultTarget(baseCode) {
    if (baseCode === 'RUB') return 'USD';
    if (state.lang === 'ru' || (state.favorites && state.favorites.includes('RUB'))) return 'RUB';
    if (baseCode === 'USD') return 'EUR';
    return 'USD';
}

/**
 * Updates equation row and compact market hint.
 */
function updateMarketRateHint() {
    const baseSelect = document.getElementById('custom-base-select');
    const targetSelect = document.getElementById('custom-target-select');
    const hintRow = document.getElementById('rate-market-hint-row');
    const hintText = document.getElementById('custom-market-hint-text');
    const baseBadge = document.getElementById('rate-base-code-badge');
    const baseFlag = document.getElementById('rate-base-flag');
    const targetBadge = document.getElementById('rate-target-code-badge');
    const targetFlag = document.getElementById('rate-target-flag');
    const extraFields = document.getElementById('custom-currency-extra-fields');

    if (!baseSelect || !targetSelect) return;

    const base = baseSelect.value || 'USD';
    const target = targetSelect.value || 'RUB';

    // Target emoji & badge in equation row
    if (targetBadge) targetBadge.textContent = target;
    if (targetFlag) {
        const targetMeta = (typeof currencyDb !== 'undefined' && currencyDb[target]) ? currencyDb[target] : { f: '💵' };
        targetFlag.textContent = targetMeta.f || '💵';
    }

    if (base === '__NEW__') {
        if (extraFields) extraFields.style.display = 'grid';
        const codeInput = document.getElementById('new-curr-code');
        const codeVal = (codeInput && codeInput.value.trim().toUpperCase()) || 'NEW';
        if (baseBadge) baseBadge.textContent = codeVal;
        if (baseFlag) baseFlag.textContent = '🏷️';
        if (hintRow) hintRow.style.display = 'none';
        return;
    }

    if (extraFields) extraFields.style.display = 'none';
    if (baseBadge) baseBadge.textContent = base;
    if (baseFlag) {
        const baseMeta = (typeof currencyDb !== 'undefined' && currencyDb[base]) ? currencyDb[base] : { f: '💵' };
        baseFlag.textContent = baseMeta.f || '💵';
    }
    if (hintRow) hintRow.style.display = 'flex';

    const baseRateUSD = state.rates ? (state.rates[base] || 1) : 1;
    const targetRateUSD = state.rates ? (state.rates[target] || 1) : 1;
    const marketRate = targetRateUSD / baseRateUSD;

    const digits = getCurrencyDisplayDigits(marketRate, target);
    let formattedRate = marketRate.toFixed(digits);
    if (digits > 2) {
        formattedRate = formattedRate.replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1');
    }

    const targetSymbol = getCurrencySymbol(target);
    if (hintText) {
        hintText.textContent = state.lang === 'ru' 
            ? `Биржевой: ${formattedRate} ${targetSymbol}`
            : `Market rate: ${formattedRate} ${targetSymbol}`;
        hintText.dataset.marketRate = formattedRate;
    }
}

/**
 * Applies live market rate into input field.
 */
function applyMarketRate() {
    const hintText = document.getElementById('custom-market-hint-text');
    const rateInput = document.getElementById('custom-rate-val');
    if (!hintText || !rateInput) return;

    const rateVal = hintText.dataset.marketRate;
    if (rateVal) {
        rateInput.value = rateVal;
        rateInput.focus();
        triggerHaptic(10);
    }
}

/**
 * Opens Custom Rate Modal for creating or editing.
 */
function openCustomRateModal({ baseCode, editId } = {}) {
    if (typeof closeVirtualKeypad === 'function') closeVirtualKeypad();

    currentEditCustomId = editId || null;
    closePicker();
    populateCustomRateSelects();

    const modal = document.getElementById('custom-rate-modal');
    const titleEl = document.getElementById('ui-custom-modal-title');
    const deleteBtn = document.getElementById('btn-delete-custom');
    const saveBtn = document.getElementById('btn-save-custom');

    const rateInput = document.getElementById('custom-rate-val');
    const noteInput = document.getElementById('custom-note-input');

    const newCodeInput = document.getElementById('new-curr-code');
    const newNameInput = document.getElementById('new-curr-name');
    const extraFields = document.getElementById('custom-currency-extra-fields');

    let initialBase = 'USD';
    let initialTarget = 'RUB';

    if (editId && state.customCurrencies && state.customCurrencies[editId]) {
        const item = state.customCurrencies[editId];
        if (titleEl) titleEl.textContent = state.lang === 'ru' ? 'Редактирование курса' : 'Edit Custom Rate';
        if (deleteBtn) deleteBtn.style.display = 'inline-block';
        if (saveBtn) saveBtn.textContent = state.lang === 'ru' ? 'Сохранить' : 'Save';

        if (item.baseCode) {
            initialBase = item.baseCode;
            if (extraFields) extraFields.style.display = 'none';
        } else {
            initialBase = '__NEW__';
            if (extraFields) extraFields.style.display = 'grid';
            if (newCodeInput) newCodeInput.value = item.code || '';
            if (newNameInput) newNameInput.value = item.name || '';
        }

        initialTarget = item.rateCurrency || 'RUB';
        if (rateInput) rateInput.value = item.rateValue || '';
        if (noteInput) noteInput.value = item.note || '';
    } else {
        if (titleEl) titleEl.textContent = state.lang === 'ru' ? 'Фиксация курса' : 'Lock Exchange Rate';
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (saveBtn) saveBtn.textContent = state.lang === 'ru' ? 'Сохранить' : 'Save';

        initialBase = baseCode || (state.favorites && state.favorites[0]) || 'USD';
        initialTarget = getSmartDefaultTarget(initialBase);

        if (extraFields) extraFields.style.display = 'none';
        if (rateInput) rateInput.value = '';
        if (noteInput) noteInput.value = '';

        if (newCodeInput) newCodeInput.value = '';
        if (newNameInput) newNameInput.value = '';
    }

    selectPickerCurrency('base', initialBase, false);
    selectPickerCurrency('target', initialTarget, false);
    updateMarketRateHint();

    if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
    }

    setTimeout(() => {
        if (rateInput && !editId) rateInput.focus();
    }, 50);
}

/**
 * Closes modal.
 */
function closeCustomRateModal() {
    const modal = document.getElementById('custom-rate-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
    currentEditCustomId = null;
}

/**
 * Saves custom rate.
 */
function saveCustomRate() {
    if (!state.customCurrencies || typeof state.customCurrencies !== 'object') {
        state.customCurrencies = {};
    }

    const baseSelect = document.getElementById('custom-base-select');
    const targetSelect = document.getElementById('custom-target-select');
    const rateInput = document.getElementById('custom-rate-val');
    const noteInput = document.getElementById('custom-note-input');

    const cleanRateStr = rateInput ? parseCleanNumber(rateInput.value.replace(/,/g, '.')) : '';
    const rateValue = parseFloat(cleanRateStr);

    if (isNaN(rateValue) || rateValue <= 0) {
        triggerCustomToast(state.lang === 'ru' ? 'Введите курс больше 0' : 'Enter rate greater than 0');
        if (rateInput) rateInput.focus();
        return;
    }

    const baseVal = baseSelect ? baseSelect.value : 'USD';
    const rateCurrency = targetSelect ? targetSelect.value : 'RUB';
    const note = noteInput ? noteInput.value.trim() : '';

    if (baseVal === '__NEW__') {
        const newCodeInput = document.getElementById('new-curr-code');
        const newNameInput = document.getElementById('new-curr-name');
        const code = (newCodeInput && newCodeInput.value.trim().toUpperCase()) || '';

        if (!code || code.length < 2 || code.length > 8) {
            triggerCustomToast(state.lang === 'ru' ? 'Укажите код валюты (2-8 букв)' : 'Enter currency code (2-8 chars)');
            if (newCodeInput) newCodeInput.focus();
            return;
        }

        const name = (newNameInput && newNameInput.value.trim()) || code;
        const id = currentEditCustomId || `cust_new_${code}_${Date.now().toString(36)}`;

        state.customCurrencies[id] = {
            id,
            baseCode: null,
            code,
            flag: '🏷️',
            name,
            note,
            rateValue,
            rateCurrency,
            rateDirection: 'direct',
            isCustom: true,
            updatedAt: Date.now()
        };

        if (!state.favorites.includes(id)) {
            state.favorites.push(id);
        }
    } else {
        const baseCode = baseVal;
        const baseItem = (typeof currencyDb !== 'undefined' && currencyDb[baseCode]) ? currencyDb[baseCode] : { f: '💵' };
        const id = currentEditCustomId || `cust_${baseCode}_${Date.now().toString(36)}`;

        state.customCurrencies[id] = {
            id,
            baseCode,
            code: baseCode,
            flag: baseItem.f || '💵',
            name: getCurrencyName(baseCode),
            note,
            rateValue,
            rateCurrency,
            rateDirection: 'direct',
            isCustom: true,
            updatedAt: Date.now()
        };

        if (!state.favorites.includes(id)) {
            const baseIdx = state.favorites.indexOf(baseCode);
            if (baseIdx !== -1) {
                state.favorites.splice(baseIdx + 1, 0, id);
            } else {
                state.favorites.unshift(id);
            }
        }
    }

    permanentFavorites = [...state.favorites];
    recomputeCustomRates();
    saveState();
    renderMain();
    if (typeof filterCurrencies === 'function') filterCurrencies();
    closeCustomRateModal();
    triggerCustomToast(state.lang === 'ru' ? 'Курс сохранён' : 'Rate saved');
    triggerHaptic(15);
}

/**
 * Deletes custom rate.
 */
function deleteCustomRate(id) {
    const targetId = id || currentEditCustomId;
    if (!targetId || !state.customCurrencies || !state.customCurrencies[targetId]) return;

    delete state.customCurrencies[targetId];
    if (state.rates && state.rates[targetId]) {
        delete state.rates[targetId];
    }

    state.favorites = state.favorites.filter(c => c !== targetId);
    permanentFavorites = [...state.favorites];

    if (currentInputCode === targetId) {
        currentInputCode = null;
        currentInputValue = '';
    }

    recomputeCustomRates();
    saveState();
    renderMain();
    if (typeof filterCurrencies === 'function') filterCurrencies();
    closeCustomRateModal();
    triggerCustomToast(state.lang === 'ru' ? 'Курс удалён' : 'Rate deleted');
    triggerHaptic(15);
}

/**
 * Attaches events.
 */
function setupCustomRateEvents() {
    const closeBtn = document.getElementById('ui-custom-close-btn');
    const cancelBtn = document.getElementById('btn-cancel-custom');
    const saveBtn = document.getElementById('btn-save-custom');
    const deleteBtn = document.getElementById('btn-delete-custom');

    const baseBtn = document.getElementById('custom-base-btn');
    const targetBtn = document.getElementById('custom-target-btn');
    const baseSearch = document.getElementById('base-picker-search');
    const targetSearch = document.getElementById('target-picker-search');

    const leftBadge = document.getElementById('rate-eq-left-badge');
    const rightBadge = document.getElementById('rate-eq-right-badge');

    const useMarketBtn = document.getElementById('btn-use-market-rate');
    const newCodeInput = document.getElementById('new-curr-code');
    const newNameInput = document.getElementById('new-curr-name');
    const baseBadge = document.getElementById('rate-base-code-badge');

    if (closeBtn) closeBtn.addEventListener('click', closeCustomRateModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeCustomRateModal);
    if (saveBtn) saveBtn.addEventListener('click', saveCustomRate);
    if (deleteBtn) deleteBtn.addEventListener('click', () => deleteCustomRate());

    if (baseBtn) baseBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePicker('base'); });
    if (targetBtn) targetBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePicker('target'); });

    if (leftBadge) leftBadge.addEventListener('click', (e) => { e.stopPropagation(); openPicker('base'); });
    if (rightBadge) rightBadge.addEventListener('click', (e) => { e.stopPropagation(); openPicker('target'); });

    if (baseSearch) {
        baseSearch.addEventListener('input', (e) => renderPickerList('base', e.target.value));
        baseSearch.addEventListener('click', (e) => e.stopPropagation());
    }
    if (targetSearch) {
        targetSearch.addEventListener('input', (e) => renderPickerList('target', e.target.value));
        targetSearch.addEventListener('click', (e) => e.stopPropagation());
    }

    if (useMarketBtn) useMarketBtn.addEventListener('click', applyMarketRate);

    if (newCodeInput) {
        newCodeInput.addEventListener('input', () => {
            const val = newCodeInput.value.trim().toUpperCase();
            if (baseBadge) baseBadge.textContent = val || 'NEW';
            const basePickerCode = document.getElementById('base-picker-code');
            if (basePickerCode) basePickerCode.textContent = val || 'NEW';
        });
    }

    if (newNameInput) {
        newNameInput.addEventListener('input', () => {
            const val = newNameInput.value.trim();
            const basePickerName = document.getElementById('base-picker-name');
            if (basePickerName) basePickerName.textContent = val || (state.lang === 'ru' ? 'Своя валюта' : 'Custom Currency');
        });
    }

    // Close pickers on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#picker-base-container')) {
            closePicker('base');
        }
        if (!e.target.closest('#picker-target-container')) {
            closePicker('target');
        }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const baseDropdown = document.getElementById('base-picker-dropdown');
            const targetDropdown = document.getElementById('target-picker-dropdown');
            if ((baseDropdown && !baseDropdown.hidden) || (targetDropdown && !targetDropdown.hidden)) {
                e.stopPropagation();
                closePicker();
            }
        }
    });
}
