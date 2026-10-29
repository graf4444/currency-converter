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
 * Populates base and target currency dropdowns cleanly.
 */
function populateCustomRateSelects() {
    const baseSelect = document.getElementById('custom-base-select');
    const targetSelect = document.getElementById('custom-target-select');

    if (!baseSelect || !targetSelect || typeof currencyDb === 'undefined') return;

    const currentBase = baseSelect.value || 'USD';
    const currentTarget = targetSelect.value || (state.lang === 'ru' ? 'RUB' : 'USD');

    // Popular and active favorites first
    const favSet = new Set(state.favorites || ['USD', 'EUR', 'RUB']);
    const allCodes = Object.keys(currencyDb);
    const sortedCodes = [
        ...allCodes.filter(c => favSet.has(c)),
        ...allCodes.filter(c => !favSet.has(c))
    ];

    let baseHTML = sortedCodes.map(code => {
        const item = currencyDb[code];
        const name = (item.n && (item.n[state.lang] || item.n['en'])) || code;
        const sel = code === currentBase ? 'selected' : '';
        return `<option value="${code}" ${sel}>${item.f || ''} ${code} — ${name}</option>`;
    }).join('');

    // Append custom currency option at the bottom
    const newOptionText = state.lang === 'ru' ? '➕ Другая своя валюта (баллы, мили...)' : '➕ Other custom currency (points, miles...)';
    baseHTML += `<option value="__NEW__" ${currentBase === '__NEW__' ? 'selected' : ''}>${newOptionText}</option>`;

    const targetHTML = sortedCodes.map(code => {
        const item = currencyDb[code];
        const name = (item.n && (item.n[state.lang] || item.n['en'])) || code;
        const sel = code === currentTarget ? 'selected' : '';
        return `<option value="${code}" ${sel}>${item.f || ''} ${code} — ${name}</option>`;
    }).join('');

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
    const extraFields = document.getElementById('custom-currency-extra-fields');

    if (!baseSelect || !targetSelect) return;

    const base = baseSelect.value || 'USD';
    const target = targetSelect.value || 'RUB';

    if (base === '__NEW__') {
        if (extraFields) extraFields.style.display = 'grid';
        if (baseBadge) {
            const codeInput = document.getElementById('new-curr-code');
            baseBadge.textContent = (codeInput && codeInput.value.trim().toUpperCase()) || 'NEW';
        }
        if (hintRow) hintRow.style.display = 'none';
        return;
    }

    if (extraFields) extraFields.style.display = 'none';
    if (baseBadge) baseBadge.textContent = base;
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
    populateCustomRateSelects();

    const modal = document.getElementById('custom-rate-modal');
    const titleEl = document.getElementById('ui-custom-modal-title');
    const deleteBtn = document.getElementById('btn-delete-custom');
    const saveBtn = document.getElementById('btn-save-custom');

    const baseSelect = document.getElementById('custom-base-select');
    const targetSelect = document.getElementById('custom-target-select');
    const rateInput = document.getElementById('custom-rate-val');
    const noteInput = document.getElementById('custom-note-input');

    const newCodeInput = document.getElementById('new-curr-code');
    const newNameInput = document.getElementById('new-curr-name');
    const extraFields = document.getElementById('custom-currency-extra-fields');

    if (editId && state.customCurrencies && state.customCurrencies[editId]) {
        const item = state.customCurrencies[editId];
        if (titleEl) titleEl.textContent = state.lang === 'ru' ? 'Редактирование курса' : 'Edit Custom Rate';
        if (deleteBtn) deleteBtn.style.display = 'inline-block';
        if (saveBtn) saveBtn.textContent = state.lang === 'ru' ? 'Сохранить' : 'Save';

        if (item.baseCode) {
            if (baseSelect) baseSelect.value = item.baseCode;
            if (extraFields) extraFields.style.display = 'none';
        } else {
            if (baseSelect) baseSelect.value = '__NEW__';
            if (extraFields) extraFields.style.display = 'grid';
            if (newCodeInput) newCodeInput.value = item.code || '';
            if (newNameInput) newNameInput.value = item.name || '';
        }

        if (targetSelect) targetSelect.value = item.rateCurrency || 'RUB';
        if (rateInput) rateInput.value = item.rateValue || '';
        if (noteInput) noteInput.value = item.note || '';
    } else {
        if (titleEl) titleEl.textContent = state.lang === 'ru' ? 'Фиксация курса' : 'Lock Exchange Rate';
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (saveBtn) saveBtn.textContent = state.lang === 'ru' ? 'Сохранить' : 'Save';

        const initialBase = baseCode || (state.favorites && state.favorites[0]) || 'USD';
        if (baseSelect) baseSelect.value = initialBase;
        if (extraFields) extraFields.style.display = 'none';

        if (targetSelect) targetSelect.value = getSmartDefaultTarget(initialBase);
        if (rateInput) rateInput.value = '';
        if (noteInput) noteInput.value = '';

        if (newCodeInput) newCodeInput.value = '';
        if (newNameInput) newNameInput.value = '';
    }

    updateMarketRateHint();

    if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
    }
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

    const baseSelect = document.getElementById('custom-base-select');
    const targetSelect = document.getElementById('custom-target-select');
    const useMarketBtn = document.getElementById('btn-use-market-rate');
    const newCodeInput = document.getElementById('new-curr-code');
    const baseBadge = document.getElementById('rate-base-code-badge');

    if (closeBtn) closeBtn.addEventListener('click', closeCustomRateModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeCustomRateModal);
    if (saveBtn) saveBtn.addEventListener('click', saveCustomRate);
    if (deleteBtn) deleteBtn.addEventListener('click', () => deleteCustomRate());

    if (baseSelect) baseSelect.addEventListener('change', updateMarketRateHint);
    if (targetSelect) targetSelect.addEventListener('change', updateMarketRateHint);
    if (useMarketBtn) useMarketBtn.addEventListener('click', applyMarketRate);

    if (newCodeInput && baseBadge) {
        newCodeInput.addEventListener('input', () => {
            const val = newCodeInput.value.trim().toUpperCase();
            baseBadge.textContent = val || 'NEW';
        });
    }
}
