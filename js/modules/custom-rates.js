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
        const customName = (newNameInput && newNameInput.value.trim()) || getCustomI18n('customRateBtn', state.lang === 'ru' ? 'Своя валюта' : 'Custom currency');
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
function selectPickerCurrency(type, rawCode, updateHint = true) {
    let code = rawCode;
    // Guard: Never allow custom currency IDs to be selected as base or target
    if (code !== '__NEW__' && (!currencyDb || !currencyDb[code])) {
        if (state && state.customCurrencies && state.customCurrencies[code]) {
            const item = state.customCurrencies[code];
            if (item.baseCode && currencyDb && currencyDb[item.baseCode]) {
                code = item.baseCode;
            } else if (type === 'base') {
                code = '__NEW__';
            } else {
                code = 'RUB';
            }
        } else {
            code = type === 'base' ? 'USD' : 'RUB';
        }
    }

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
        listEl.innerHTML = `<div class="picker-empty">${getCustomI18n('noCurrenciesFound', state.lang === 'ru' ? 'Ничего не найдено' : 'No currencies found')}</div>`;
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

    // Dismiss any active mobile keyboard
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }

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

    const touch = typeof isTouchDevice === 'function' && isTouchDevice();

    setTimeout(() => {
        if (!touch && searchInput) {
            searchInput.focus();
        }
        const selectedItem = dropdown.querySelector('.picker-item.is-selected');
        const listEl = document.getElementById(`${type}-picker-list`);
        if (listEl && selectedItem) {
            listEl.scrollTop = Math.max(0, selectedItem.offsetTop - 50);
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
    const basePickerCode = document.getElementById('base-picker-code');
    const basePickerFlag = document.getElementById('base-picker-flag');
    const targetPickerCode = document.getElementById('target-picker-code');
    const targetPickerFlag = document.getElementById('target-picker-flag');
    const extraFields = document.getElementById('custom-currency-extra-fields');

    if (!baseSelect || !targetSelect) return;

    const base = baseSelect.value || 'USD';
    const target = targetSelect.value || 'RUB';

    // Target emoji & badge in equation row
    if (targetBadge) targetBadge.textContent = target;
    if (targetPickerCode) targetPickerCode.textContent = target;
    const targetMeta = (typeof currencyDb !== 'undefined' && currencyDb[target]) ? currencyDb[target] : { f: '💵' };
    if (targetFlag) targetFlag.textContent = targetMeta.f || '💵';
    if (targetPickerFlag) targetPickerFlag.textContent = targetMeta.f || '💵';

    if (base === '__NEW__') {
        if (extraFields) extraFields.style.display = 'grid';
        const codeInput = document.getElementById('new-curr-code');
        const codeVal = (codeInput && codeInput.value.trim().toUpperCase()) || 'NEW';
        if (baseBadge) baseBadge.textContent = codeVal;
        if (basePickerCode) basePickerCode.textContent = codeVal;
        if (baseFlag) baseFlag.textContent = '🏷️';
        if (basePickerFlag) basePickerFlag.textContent = '🏷️';
        if (hintRow) hintRow.style.display = 'none';
        return;
    }

    if (extraFields) extraFields.style.display = 'none';
    if (baseBadge) baseBadge.textContent = base;
    if (basePickerCode) basePickerCode.textContent = base;
    const baseMeta = (typeof currencyDb !== 'undefined' && currencyDb[base]) ? currencyDb[base] : { f: '💵' };
    if (baseFlag) baseFlag.textContent = baseMeta.f || '💵';
    if (basePickerFlag) basePickerFlag.textContent = baseMeta.f || '💵';
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
        const marketLabel = getCustomI18n('marketRateTitle', state.lang === 'ru' ? 'Биржевой' : 'Market rate');
        hintText.textContent = `${marketLabel}: ${formattedRate} ${targetSymbol}`;
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
        const touch = typeof isTouchDevice === 'function' && isTouchDevice();
        if (!touch) {
            rateInput.focus();
        }
        triggerHaptic(10);
    }
}

/**
 * Resolves root currency code from either a standard code ('USD') or a custom ID ('cust_USD_...').
 */
function getCurrencyRootCode(codeOrId) {
    if (!codeOrId) return '';
    if (state && state.customCurrencies && state.customCurrencies[codeOrId]) {
        const item = state.customCurrencies[codeOrId];
        return (item.baseCode || item.code || codeOrId).toUpperCase();
    }
    return String(codeOrId).toUpperCase();
}

/**
 * Returns all available variants (market rate + all custom locked rates) for a given root currency code.
 */
function getCurrencyVariants(rootCode) {
    const root = (rootCode || '').toUpperCase();
    const variants = [];

    // 1. Market variant (if registered in currencyDb)
    if (typeof currencyDb !== 'undefined' && currencyDb[root]) {
        const dbItem = currencyDb[root];
        const name = (dbItem.n && (dbItem.n[state.lang] || dbItem.n['en'])) || root;
        variants.push({
            id: root,
            rootCode: root,
            isMarket: true,
            flag: dbItem.f || '💵',
            name: name,
            displayCode: root,
            note: '',
            rateCurrency: '',
            rateValue: 0
        });
    }

    // 2. Custom variants from state.customCurrencies
    if (state && state.customCurrencies && typeof state.customCurrencies === 'object') {
        Object.values(state.customCurrencies).forEach(custom => {
            if (!custom || !custom.id) return;
            const customRoot = (custom.baseCode || custom.code || '').toUpperCase();
            if (customRoot === root) {
                const name = custom.name || (typeof getCurrencyName === 'function' ? getCurrencyName(custom.id) : root);
                variants.push({
                    id: custom.id,
                    rootCode: root,
                    isMarket: false,
                    flag: custom.flag || '🏷️',
                    name: name,
                    displayCode: custom.baseCode || custom.code || root,
                    note: custom.note || '',
                    rateCurrency: custom.rateCurrency || 'USD',
                    rateValue: custom.rateValue,
                    rateDirection: custom.rateDirection || 'direct',
                    item: custom
                });
            }
        });
    }

    return variants;
}

/**
 * Returns which variant ID of rootCode is currently active in state.favorites.
 */
function getActiveVariantId(rootCode) {
    const root = (rootCode || '').toUpperCase();
    const variants = getCurrencyVariants(root);
    const variantIds = variants.map(v => v.id);
    const active = state && state.favorites ? state.favorites.find(id => variantIds.includes(id)) : null;
    return active || (variants.length > 0 ? variants[0].id : root);
}

/**
 * Sets targetVariantId as the single active variant for rootCode in favorites,
 * replacing any previous variant of that currency in-place.
 */
function setCurrencyVariant(rootCode, targetVariantId, showToastNotice = false) {
    const root = (rootCode || '').toUpperCase();
    const variants = getCurrencyVariants(root);
    const variantIds = variants.map(v => v.id);

    if (!variantIds.includes(targetVariantId)) return;

    if (!Array.isArray(state.favorites)) state.favorites = [];

    const existingIdx = state.favorites.findIndex(id => variantIds.includes(id));
    if (existingIdx !== -1) {
        state.favorites[existingIdx] = targetVariantId;
        state.favorites = state.favorites.filter((id, idx) => idx === existingIdx || !variantIds.includes(id));
    } else {
        state.favorites.push(targetVariantId);
    }

    permanentFavorites = [...state.favorites];

    if (currentInputCode && variantIds.includes(currentInputCode)) {
        currentInputCode = targetVariantId;
    }

    recomputeCustomRates();
    saveState();
    renderMain();

    if (typeof filterCurrencies === 'function') {
        filterCurrencies();
    }

    if (currentInputCode && currentInputValue !== '' && typeof recalculate === 'function') {
        recalculate(currentInputCode, currentInputValue);
    }

    if (showToastNotice) {
        const selected = variants.find(v => v.id === targetVariantId);
        const name = selected ? (selected.note ? `${selected.name} (${selected.note})` : selected.name) : root;
        const msg = (getCustomI18n('variantSwitched', 'Курс {code} переключен')).replace('{code}', name);
        triggerCustomToast(msg);
        triggerHaptic(12);
    }
}

/**
 * Sanitizes favorites list so each root currency has at most one variant present.
 */
function normalizeFavoritesVariants() {
    if (!state || !state.favorites || !Array.isArray(state.favorites)) return;
    const seenRoots = new Set();
    const cleaned = [];

    state.favorites.forEach(code => {
        if (!code) return;
        const root = getCurrencyRootCode(code);
        if (!seenRoots.has(root)) {
            seenRoots.add(root);
            cleaned.push(code);
        }
    });

    if (cleaned.length !== state.favorites.length) {
        state.favorites = cleaned;
        permanentFavorites = [...state.favorites];
        saveState();
    }
}

/**
 * Opens Variant Selector Modal to choose between Market or Custom rates for a currency.
 */
function openVariantSelectorModal(rootCode) {
    if (typeof closeVirtualKeypad === 'function') closeVirtualKeypad();

    const root = (rootCode || '').toUpperCase();
    const variants = getCurrencyVariants(root);
    const activeId = getActiveVariantId(root);

    const modal = document.getElementById('variant-selector-modal');
    const titleEl = document.getElementById('variant-modal-title');
    const subtitleEl = document.getElementById('variant-modal-subtitle');
    const flagEl = document.getElementById('variant-modal-flag');
    const listEl = document.getElementById('variant-options-list');
    const addBtn = document.getElementById('btn-variant-add-new');
    const addBtnText = document.getElementById('btn-variant-add-text');

    if (!modal || !listEl) return;

    const rootMeta = (typeof currencyDb !== 'undefined' && currencyDb[root]) ? currencyDb[root] : { f: '🏷️' };
    const rootName = (rootMeta.n && (rootMeta.n[state.lang] || rootMeta.n['en'])) || (variants.length > 0 ? variants[0].name : root);

    if (flagEl) flagEl.textContent = rootMeta.f || (variants.length > 0 ? variants[0].flag : '🏷️');
    if (titleEl) {
        const titleTmpl = getCustomI18n('variantModalTitle', 'Варианты курса {code}');
        titleEl.textContent = titleTmpl.replace('{code}', root);
    }
    if (subtitleEl) {
        subtitleEl.textContent = rootName;
    }
    if (addBtnText) {
        const addTmpl = getCustomI18n('btnVariantAdd', 'Зафиксировать ещё один курс {code}...');
        addBtnText.textContent = addTmpl.replace('{code}', root);
    }

    const defaultTarget = getSmartDefaultTarget(root);
    const defaultTargetSymbol = typeof getCurrencySymbol === 'function' ? getCurrencySymbol(defaultTarget) : defaultTarget;

    listEl.innerHTML = variants.map(v => {
        const isActive = v.id === activeId;
        if (v.isMarket) {
            const baseRateUSD = state.rates ? (state.rates[root] || 1) : 1;
            const targetRateUSD = state.rates ? (state.rates[defaultTarget] || 1) : 1;
            const marketRate = targetRateUSD / baseRateUSD;
            const digits = getCurrencyDisplayDigits(marketRate, defaultTarget);
            let formattedRate = marketRate.toFixed(digits);
            if (digits > 2) formattedRate = formattedRate.replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1');
            const rateFormattedStr = formatNumberString(formattedRate);

            const marketTitle = getCustomI18n('marketRateTitle', 'Биржевой курс');
            const marketDesc = state.lang === 'ru'
                ? `Текущий биржевой: 1 ${root} ≈ ${rateFormattedStr} ${defaultTargetSymbol}`
                : `Live market rate: 1 ${root} ≈ ${rateFormattedStr} ${defaultTargetSymbol}`;
            const tagLabel = getCustomI18n('marketTag', 'Биржевой');

            return `
                <div class="variant-option-card ${isActive ? 'is-active' : ''}" data-variant-id="${v.id}" role="radio" aria-checked="${isActive}">
                    <div class="variant-option-left">
                        <div class="variant-radio-circle">
                            <span class="variant-radio-check">✓</span>
                        </div>
                        <div class="variant-option-info">
                            <div class="variant-option-header-row">
                                <span class="variant-option-name">${escapeHTML(marketTitle)}</span>
                                <span class="variant-option-tag">${escapeHTML(tagLabel)}</span>
                            </div>
                            <div class="variant-option-desc">${escapeHTML(marketDesc)}</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            const baseSymbol = typeof getCurrencySymbol === 'function' ? getCurrencySymbol(v.displayCode) : v.displayCode;
            const targetSymbol = typeof getCurrencySymbol === 'function' ? getCurrencySymbol(v.rateCurrency) : v.rateCurrency;
            const formattedRate = typeof formatNumberString === 'function' ? formatNumberString(String(v.rateValue)) : String(v.rateValue);
            const rateBadgeText = v.rateDirection === 'reverse'
                ? `1 ${targetSymbol} = ${formattedRate} ${baseSymbol}`
                : `1 ${baseSymbol} = ${formattedRate} ${targetSymbol}`;

            const nameText = v.note ? v.note : getCustomI18n('customTag', state.lang === 'ru' ? 'Свой курс' : 'Custom rate');
            const descText = state.lang === 'ru' ? 'Зафиксированный курс • Сохранено локально' : (getCustomI18n('noticeLocalDesc', 'Locked exchange rate • Saved locally')).replace('🔒 ', '');

            return `
                <div class="variant-option-card ${isActive ? 'is-active' : ''}" data-variant-id="${v.id}" role="radio" aria-checked="${isActive}">
                    <div class="variant-option-left">
                        <div class="variant-radio-circle">
                            <span class="variant-radio-check">✓</span>
                        </div>
                        <div class="variant-option-info">
                            <div class="variant-option-header-row">
                                <span class="variant-option-name">${escapeHTML(nameText)}</span>
                                <span class="variant-option-rate-badge">${escapeHTML(rateBadgeText)}</span>
                            </div>
                            <div class="variant-option-desc">${escapeHTML(descText)}</div>
                        </div>
                    </div>
                    <div class="variant-option-actions">
                        <button type="button" class="variant-btn-edit" data-edit-id="${v.id}" title="${escapeHTML(getCustomI18n('editRate', state.lang === 'ru' ? 'Редактировать курс' : 'Edit rate'))}" aria-label="${escapeHTML(getCustomI18n('editRate', 'Edit rate'))}">✎</button>
                        <button type="button" class="variant-btn-delete" data-delete-id="${v.id}" title="${escapeHTML(getCustomI18n('deleteRate', state.lang === 'ru' ? 'Удалить курс' : 'Delete rate'))}" aria-label="${escapeHTML(getCustomI18n('deleteRate', 'Delete rate'))}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }
    }).join('');

    listEl.querySelectorAll('.variant-option-card').forEach(cardEl => {
        cardEl.addEventListener('click', (e) => {
            if (e.target.closest('.variant-btn-edit') || e.target.closest('.variant-btn-delete')) return;
            const variantId = cardEl.dataset.variantId;
            setCurrencyVariant(root, variantId, true);
            closeVariantSelectorModal();
        });
    });

    listEl.querySelectorAll('.variant-btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const editId = btn.dataset.editId;
            closeVariantSelectorModal();
            openCustomRateModal({ editId });
        });
    });

    listEl.querySelectorAll('.variant-btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const delId = btn.dataset.deleteId;
            deleteCustomRateWithUndo(delId);
        });
    });

    if (addBtn) {
        addBtn.onclick = () => {
            closeVariantSelectorModal();
            if (typeof currencyDb !== 'undefined' && currencyDb[root]) {
                openCustomRateModal({ baseCode: root });
            } else {
                openCustomRateModal({ baseCode: '__NEW__' });
            }
        };
    }

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
}

/**
 * Cleans up any legacy or corrupted custom currencies (e.g. custom rates accidentally created on custom rates).
 */
function sanitizeCustomCurrencies() {
    if (!state || !state.customCurrencies || typeof state.customCurrencies !== 'object') return;

    let modified = false;
    Object.keys(state.customCurrencies).forEach(id => {
        const item = state.customCurrencies[id];
        if (!item) return;

        // 1. If baseCode points to a custom ID
        if (item.baseCode && (item.baseCode.startsWith('cust_') || state.customCurrencies[item.baseCode])) {
            const parent = state.customCurrencies[item.baseCode];
            if (parent && parent.baseCode && currencyDb && currencyDb[parent.baseCode]) {
                item.baseCode = parent.baseCode;
                item.code = parent.baseCode;
            } else {
                item.baseCode = null;
                item.code = (item.code || 'CUSTOM').replace(/^cust_/i, '').toUpperCase().slice(0, 8);
            }
            modified = true;
        }

        // 2. If baseCode is not registered in currencyDb
        if (item.baseCode && (!currencyDb || !currencyDb[item.baseCode])) {
            item.baseCode = null;
            modified = true;
        }

        // 3. If rateCurrency points to a custom ID or not in currencyDb
        if (item.rateCurrency && (!currencyDb || !currencyDb[item.rateCurrency] || item.rateCurrency.startsWith('cust_'))) {
            const parent = state.customCurrencies[item.rateCurrency];
            if (parent && parent.rateCurrency && currencyDb && currencyDb[parent.rateCurrency]) {
                item.rateCurrency = parent.rateCurrency;
            } else {
                item.rateCurrency = 'RUB';
            }
            modified = true;
        }
    });

    if (modified) {
        saveState();
    }
}

function closeVariantSelectorModal() {
    const modal = document.getElementById('variant-selector-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
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
        if (titleEl) titleEl.textContent = getCustomI18n('customRateEditTitle', state.lang === 'ru' ? 'Редактирование курса' : 'Edit Custom Rate');
        if (deleteBtn) deleteBtn.style.display = 'inline-block';
        if (saveBtn) saveBtn.textContent = getCustomI18n('saveRate', state.lang === 'ru' ? 'Сохранить' : 'Save');

        if (item.baseCode && currencyDb && currencyDb[item.baseCode]) {
            initialBase = item.baseCode;
            if (extraFields) extraFields.style.display = 'none';
        } else {
            initialBase = '__NEW__';
            if (extraFields) extraFields.style.display = 'grid';
            if (newCodeInput) newCodeInput.value = item.code || '';
            if (newNameInput) newNameInput.value = item.name || '';
        }

        initialTarget = (item.rateCurrency && currencyDb && currencyDb[item.rateCurrency]) ? item.rateCurrency : 'RUB';
        if (rateInput) rateInput.value = item.rateValue || '';
        if (noteInput) noteInput.value = item.note || '';
    } else {
        if (titleEl) titleEl.textContent = getCustomI18n('customRateTitle', state.lang === 'ru' ? 'Фиксация курса' : 'Lock Exchange Rate');
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (saveBtn) saveBtn.textContent = getCustomI18n('saveRate', state.lang === 'ru' ? 'Сохранить' : 'Save');

        // STRICT RESOLUTION OF BASE CURRENCY (NEVER ALLOW CUSTOM IDS)
        let resolvedBase = null;

        if (baseCode) {
            if (baseCode === '__NEW__') {
                resolvedBase = '__NEW__';
            } else if (currencyDb && currencyDb[baseCode]) {
                resolvedBase = baseCode;
            } else if (state.customCurrencies && state.customCurrencies[baseCode]) {
                const c = state.customCurrencies[baseCode];
                resolvedBase = (c.baseCode && currencyDb && currencyDb[c.baseCode]) ? c.baseCode : '__NEW__';
            } else {
                resolvedBase = 'USD';
            }
        } else if (state.favorites && state.favorites.length > 0) {
            for (const fav of state.favorites) {
                if (currencyDb && currencyDb[fav]) {
                    resolvedBase = fav;
                    break;
                }
                if (state.customCurrencies && state.customCurrencies[fav]) {
                    const c = state.customCurrencies[fav];
                    if (c.baseCode && currencyDb && currencyDb[c.baseCode]) {
                        resolvedBase = c.baseCode;
                        break;
                    }
                }
            }
        }

        initialBase = resolvedBase || 'USD';
        initialTarget = getSmartDefaultTarget(initialBase === '__NEW__' ? 'USD' : initialBase);

        if (initialBase === '__NEW__') {
            if (extraFields) extraFields.style.display = 'grid';
        } else {
            if (extraFields) extraFields.style.display = 'none';
        }

        if (rateInput) rateInput.value = '';
        if (noteInput) noteInput.value = '';

        if (newCodeInput) newCodeInput.value = '';
        if (newNameInput) newNameInput.value = '';
    }

    selectPickerCurrency('base', initialBase, false);
    selectPickerCurrency('target', initialTarget, false);
    updateMarketRateHint();

    const curNote = (noteInput && noteInput.value.trim()) || '';
    document.querySelectorAll('.note-chip').forEach(c => {
        const tag = c.dataset.note || c.textContent.trim();
        c.classList.toggle('is-active', Boolean(curNote && tag === curNote));
    });

    if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
    }

    const touch = typeof isTouchDevice === 'function' && isTouchDevice();
    if (!touch && rateInput && !editId) {
        setTimeout(() => {
            rateInput.focus();
        }, 150);
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
        triggerCustomToast(getCustomI18n('invalidRateToast', state.lang === 'ru' ? 'Введите курс больше 0' : 'Enter rate greater than 0'));
        if (rateInput) rateInput.focus();
        return;
    }

    const baseVal = baseSelect ? baseSelect.value : 'USD';
    const rateCurrency = targetSelect ? targetSelect.value : 'RUB';
    const note = noteInput ? noteInput.value.trim() : '';

    if (baseVal === '__NEW__') {
        const newCodeInput = document.getElementById('new-curr-code');
        const newNameInput = document.getElementById('new-curr-name');
        let code = (newCodeInput && newCodeInput.value.trim().toUpperCase()) || '';
        code = code.replace(/^CUST_/, '');

        if (!code || code.length < 2 || code.length > 8) {
            triggerCustomToast(getCustomI18n('invalidCodeToast', state.lang === 'ru' ? 'Укажите код валюты (2-8 букв)' : 'Enter currency code (2-8 chars)'));
            if (newCodeInput) newCodeInput.focus();
            return;
        }

        const validTarget = (currencyDb && currencyDb[rateCurrency]) ? rateCurrency : 'RUB';
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
            rateCurrency: validTarget,
            rateDirection: 'direct',
            isCustom: true,
            updatedAt: Date.now()
        };

        setCurrencyVariant(code, id);
    } else {
        let baseCode = baseVal;
        if (!currencyDb || !currencyDb[baseCode]) {
            const root = getCurrencyRootCode(baseCode);
            if (currencyDb && currencyDb[root]) {
                baseCode = root;
            } else {
                baseCode = 'USD';
            }
        }
        const validTarget = (currencyDb && currencyDb[rateCurrency]) ? rateCurrency : 'RUB';
        const baseItem = currencyDb[baseCode] || { f: '💵' };
        const id = currentEditCustomId || `cust_${baseCode}_${Date.now().toString(36)}`;

        state.customCurrencies[id] = {
            id,
            baseCode,
            code: baseCode,
            flag: baseItem.f || '💵',
            name: getCurrencyName(baseCode),
            note,
            rateValue,
            rateCurrency: validTarget,
            rateDirection: 'direct',
            isCustom: true,
            updatedAt: Date.now()
        };

        setCurrencyVariant(baseCode, id);
    }

    permanentFavorites = [...state.favorites];
    recomputeCustomRates();
    saveState();
    renderMain();
    if (typeof filterCurrencies === 'function') filterCurrencies();
    closeCustomRateModal();
    closeVariantSelectorModal();
    triggerCustomToast(getCustomI18n('rateSavedToast', state.lang === 'ru' ? 'Курс сохранён' : 'Rate saved'));
    triggerHaptic(15);
}

let lastDeletedCustomRate = null;
let undoToastTimer = null;

function hideUndoToast() {
    clearTimeout(undoToastTimer);
    const toast = document.getElementById('undo-toast');
    if (toast) {
        toast.classList.remove('show');
        toast.classList.remove('is-animating');
    }
}

function showUndoToast(rateName, onUndo) {
    let toast = document.getElementById('undo-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'undo-toast';
        toast.className = 'undo-toast';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        document.body.appendChild(toast);
    }

    const undoLabel = getCustomI18n('undoAction', 'Отменить');
    const deleteTmpl = getCustomI18n('rateDeletedUndo', 'Курс «{name}» удалён');
    const msg = deleteTmpl.replace('{name}', rateName);

    toast.innerHTML = `
        <div class="undo-toast-content">
            <span class="undo-toast-icon">🗑️</span>
            <span class="undo-toast-message">${escapeHTML(msg)}</span>
            <button type="button" class="undo-toast-btn" id="undo-toast-action">${escapeHTML(undoLabel)}</button>
            <button type="button" class="undo-toast-close" id="undo-toast-close" aria-label="✕">✕</button>
        </div>
        <div class="undo-toast-progress"><div class="undo-toast-progress-bar"></div></div>
    `;

    const actionBtn = toast.querySelector('#undo-toast-action');
    const closeBtn = toast.querySelector('#undo-toast-close');

    if (actionBtn) {
        actionBtn.onclick = (e) => {
            e.stopPropagation();
            hideUndoToast();
            if (typeof onUndo === 'function') onUndo();
        };
    }

    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            hideUndoToast();
            lastDeletedCustomRate = null;
        };
    }

    toast.classList.remove('show', 'is-animating');
    void toast.offsetWidth; // Force CSS reflow to restart progress animation
    toast.classList.add('show', 'is-animating');

    clearTimeout(undoToastTimer);
    undoToastTimer = setTimeout(() => {
        hideUndoToast();
        lastDeletedCustomRate = null;
    }, 5500);
}

function restoreLastDeletedRate() {
    if (!lastDeletedCustomRate || !lastDeletedCustomRate.data) return;

    const { id, data, rootCode, wasActive, activeIndex, rateName } = lastDeletedCustomRate;

    if (!state.customCurrencies || typeof state.customCurrencies !== 'object') {
        state.customCurrencies = {};
    }
    state.customCurrencies[id] = data;

    if (wasActive) {
        const variants = getCurrencyVariants(rootCode);
        const variantIds = variants.map(v => v.id);
        const existingIdx = state.favorites.findIndex(c => variantIds.includes(c));
        if (existingIdx !== -1) {
            state.favorites[existingIdx] = id;
        } else {
            if (activeIndex !== -1 && activeIndex <= state.favorites.length) {
                state.favorites.splice(activeIndex, 0, id);
            } else {
                state.favorites.push(id);
            }
        }
    }

    state.favorites = [...new Set(state.favorites.filter(Boolean))];
    permanentFavorites = [...state.favorites];

    lastDeletedCustomRate = null;
    hideUndoToast();

    recomputeCustomRates();
    saveState();
    renderMain();

    if (typeof filterCurrencies === 'function') {
        if (typeof expandedCurrencyRoots !== 'undefined') {
            expandedCurrencyRoots.add(rootCode);
        }
        filterCurrencies();
    }

    const variantModal = document.getElementById('variant-selector-modal');
    if (variantModal && variantModal.style.display === 'flex') {
        openVariantSelectorModal(rootCode);
    }

    const restoreTmpl = getCustomI18n('rateRestoredToast', 'Курс «{name}» восстановлен');
    const msg = restoreTmpl.replace('{name}', rateName);
    triggerCustomToast(msg);
    triggerHaptic(12);
}

/**
 * Deletes custom rate with immediate execution and transient Undo option.
 */
function deleteCustomRateWithUndo(id) {
    const targetId = id || currentEditCustomId;
    if (!targetId || !state.customCurrencies || !state.customCurrencies[targetId]) return;

    const item = state.customCurrencies[targetId];
    const rootCode = (item.baseCode || item.code || '').toUpperCase();
    const wasActive = state.favorites.includes(targetId);
    const activeIndex = wasActive ? state.favorites.indexOf(targetId) : -1;
    const rateName = item.note || item.name || rootCode;

    lastDeletedCustomRate = {
        id: targetId,
        data: JSON.parse(JSON.stringify(item)),
        rootCode,
        wasActive,
        activeIndex,
        rateName
    };

    delete state.customCurrencies[targetId];
    if (state.rates && state.rates[targetId]) {
        delete state.rates[targetId];
    }

    if (wasActive) {
        const remaining = getCurrencyVariants(rootCode);
        if (remaining.length > 0) {
            state.favorites[activeIndex] = remaining[0].id;
        } else {
            state.favorites = state.favorites.filter(c => c !== targetId);
        }
    } else {
        state.favorites = state.favorites.filter(c => c !== targetId);
    }

    state.favorites = [...new Set(state.favorites.filter(Boolean))];
    permanentFavorites = [...state.favorites];

    if (currentInputCode === targetId) {
        const remaining = getCurrencyVariants(rootCode);
        currentInputCode = remaining.length > 0 ? remaining[0].id : null;
        if (!currentInputCode) currentInputValue = '';
    }

    recomputeCustomRates();
    saveState();
    renderMain();

    if (typeof filterCurrencies === 'function') {
        filterCurrencies();
    }

    const variantModal = document.getElementById('variant-selector-modal');
    if (variantModal && variantModal.style.display === 'flex') {
        const remaining = getCurrencyVariants(rootCode);
        if (remaining.length <= 1) {
            closeVariantSelectorModal();
        } else {
            openVariantSelectorModal(rootCode);
        }
    }

    closeCustomRateModal();
    triggerHaptic(15);

    showUndoToast(rateName, () => {
        restoreLastDeletedRate();
    });
}

/**
 * Deletes custom rate (delegates to deleteCustomRateWithUndo).
 */
function deleteCustomRate(id) {
    deleteCustomRateWithUndo(id);
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

    const noteInput = document.getElementById('custom-note-input');
    const noteChips = document.querySelectorAll('.note-chip');
    noteChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.preventDefault();
            if (!noteInput) return;
            const tag = chip.dataset.note || chip.textContent.trim();
            if (noteInput.value.trim() === tag) {
                noteInput.value = '';
                chip.classList.remove('is-active');
            } else {
                noteInput.value = tag;
                noteChips.forEach(c => c.classList.remove('is-active'));
                chip.classList.add('is-active');
            }
            if (typeof triggerHaptic === 'function') triggerHaptic(10);
        });
    });

    if (noteInput) {
        noteInput.addEventListener('input', () => {
            const val = noteInput.value.trim();
            noteChips.forEach(c => {
                const tag = c.dataset.note || c.textContent.trim();
                c.classList.toggle('is-active', tag === val);
            });
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
            const variantModal = document.getElementById('variant-selector-modal');
            if (variantModal && variantModal.style.display === 'flex') {
                e.stopPropagation();
                closeVariantSelectorModal();
                return;
            }
            const baseDropdown = document.getElementById('base-picker-dropdown');
            const targetDropdown = document.getElementById('target-picker-dropdown');
            if ((baseDropdown && !baseDropdown.hidden) || (targetDropdown && !targetDropdown.hidden)) {
                e.stopPropagation();
                closePicker();
            }
        }
    });

    const variantCloseBtn = document.getElementById('variant-modal-close-btn');
    const variantModal = document.getElementById('variant-selector-modal');
    if (variantCloseBtn) {
        variantCloseBtn.addEventListener('click', () => {
            if (typeof triggerHaptic === 'function') triggerHaptic(8);
            closeVariantSelectorModal();
        });
    }
    if (variantModal) {
        variantModal.addEventListener('click', (e) => {
            if (e.target === variantModal) {
                closeVariantSelectorModal();
            }
        });
    }
}
