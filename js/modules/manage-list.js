// ============================================================
// CURRENCY SELECTION & DRAG-AND-DROP REORDERING
// Multilingual search modal, favorites toggling, and touch reordering.
// ============================================================

const expandedCurrencyRoots = new Set();

function openModal(e) { 
    if (isQuickMode) return;
    if (isClosingKeypad || (Date.now() - lastCloseKeypadTime < 420)) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        return;
    }
    closeVirtualKeypad();

    // If active view was a temporary link session, restore permanent favorites before opening customization modal
    if (isLinkSession && Array.isArray(permanentFavorites) && permanentFavorites.length > 0) {
        state.favorites = [...permanentFavorites];
        isLinkSession = false;
        renderMain();
    }

    const modal = document.getElementById('search-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
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
    const root = typeof getCurrencyRootCode === 'function' ? getCurrencyRootCode(code) : code;
    if (shouldAdd) {
        if (typeof setCurrencyVariant === 'function') {
            const activeId = typeof getActiveVariantId === 'function' ? getActiveVariantId(root) : code;
            setCurrencyVariant(root, activeId, true);
            return;
        }
        if (!state.favorites.includes(code)) state.favorites.push(code);
    } else {
        const variants = typeof getCurrencyVariants === 'function' ? getCurrencyVariants(root) : [];
        const variantIds = variants.map(v => v.id);
        const toRemove = new Set([code, root, ...variantIds]);

        state.favorites = state.favorites.filter(c => !toRemove.has(c));
        expandedCurrencyRoots.delete(root);
        if (currentInputCode && toRemove.has(currentInputCode)) {
            currentInputCode = null;
            currentInputValue = '';
        }
    }
    state.favorites = [...new Set(state.favorites.filter(Boolean))];
    permanentFavorites = [...state.favorites];
    saveState();
    renderMain();
    filterCurrencies();
}

/**
 * Checks whether any variant of rootCode is currently in favorites.
 */
function isCurrencyInFavorites(rootCode) {
    if (!state || !Array.isArray(state.favorites)) return false;
    const root = (typeof getCurrencyRootCode === 'function' ? getCurrencyRootCode(rootCode) : rootCode).toUpperCase();
    return state.favorites.some(c => {
        const cRoot = (typeof getCurrencyRootCode === 'function' ? getCurrencyRootCode(c) : c).toUpperCase();
        return cRoot === root;
    });
}

/**
 * Formats a clean snippet for a custom rate (e.g. "1 USD = 2.72 GEL").
 */
function getCustomRateSnippet(customItem) {
    if (!customItem) return '';
    const displayCode = customItem.baseCode || customItem.code || 'CUSTOM';
    const baseSymbol = typeof getCurrencySymbol === 'function' 
        ? getCurrencySymbol(displayCode) 
        : displayCode;
    const targetSymbol = typeof getCurrencySymbol === 'function' 
        ? getCurrencySymbol(customItem.rateCurrency || 'USD') 
        : (customItem.rateCurrency || 'USD');
    const formattedRate = typeof formatNumberString === 'function' 
        ? formatNumberString(String(customItem.rateValue)) 
        : String(customItem.rateValue);
    return customItem.rateDirection === 'reverse'
        ? `1 ${targetSymbol} = ${formattedRate} ${baseSymbol}`
        : `1 ${baseSymbol} = ${formattedRate} ${targetSymbol}`;
}

/**
 * Formats a live market rate snippet for subgroup preview (e.g. "1 USD ≈ 81.34 ₽").
 */
function getMarketRateSnippet(code) {
    if (!state || !state.rates || !state.rates[code]) return '';
    const target = (typeof getSmartDefaultTarget === 'function') ? getSmartDefaultTarget(code) : (code === 'RUB' ? 'USD' : 'RUB');
    if (!state.rates[target]) return '';
    const baseRateUSD = state.rates[code] || 1;
    const targetRateUSD = state.rates[target] || 1;
    const rate = targetRateUSD / baseRateUSD;
    const digits = (typeof getCurrencyDisplayDigits === 'function') ? getCurrencyDisplayDigits(rate, target) : 2;
    let formatted = rate.toFixed(digits);
    if (digits > 2) formatted = formatted.replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1');
    const formattedStr = (typeof formatNumberString === 'function') ? formatNumberString(formatted) : formatted;
    const targetSym = (typeof getCurrencySymbol === 'function') ? getCurrencySymbol(target) : target;
    return `1 ${code} ≈ ${formattedStr} ${targetSym}`;
}

function matchesQuery(code, dbItem, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    const root = typeof getCurrencyRootCode === 'function' ? getCurrencyRootCode(code) : code;
    if (root.toLowerCase().includes(q)) return true;
    if (code.toLowerCase().includes(q)) return true;

    // Check all variants of this currency
    if (typeof getCurrencyVariants === 'function') {
        const variants = getCurrencyVariants(root);
        for (const v of variants) {
            if (v.name && v.name.toLowerCase().includes(q)) return true;
            if (v.note && v.note.toLowerCase().includes(q)) return true;
            if (v.displayCode && v.displayCode.toLowerCase().includes(q)) return true;
            if (v.rateCurrency && v.rateCurrency.toLowerCase().includes(q)) return true;
            if (v.rateValue && String(v.rateValue).includes(q)) return true;
        }
    }

    if (dbItem && dbItem.n) {
        for (const lang in dbItem.n) {
            if (dbItem.n[lang].toLowerCase().includes(q)) return true;
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

    if (typeof normalizeFavoritesVariants === 'function') {
        normalizeFavoritesVariants();
    }

    const addedFragment = document.createDocumentFragment();
    const availableFragment = document.createDocumentFragment();

    state.favorites = [...new Set(state.favorites.filter(Boolean))];

    // ============================================================
    // 1. "ВАШИ ВАЛЮТЫ" (ADDED CURRENCIES)
    // ============================================================
    state.favorites.forEach(code => {
        const isCustom = Boolean(state.customCurrencies && state.customCurrencies[code]);
        const customItem = isCustom ? state.customCurrencies[code] : null;

        const rootCode = typeof getCurrencyRootCode === 'function' ? getCurrencyRootCode(code) : code;
        const variants = typeof getCurrencyVariants === 'function' ? getCurrencyVariants(rootCode) : [];
        const hasMultipleVariants = variants.length > 1;

        const dbItem = (typeof currencyDb !== 'undefined' && currencyDb[rootCode])
            ? currencyDb[rootCode]
            : (isCustom ? { f: customItem.flag || '🏷️' } : { f: "🏳️" });

        if (!matchesQuery(code, dbItem, query)) return;

        const displayCode = isCustom ? (customItem.baseCode || customItem.code || rootCode) : rootCode;
        const nameLocal = getCurrencyName(rootCode);

        if (hasMultipleVariants) {
            // Render card with collapsible subgroup for switching variants
            const isExpanded = expandedCurrencyRoots.has(rootCode);
            const item = document.createElement('div');
            item.className = `search-item has-subgroup ${isExpanded ? '' : 'is-collapsed'}`;
            item.dataset.code = code;
            item.draggable = true;

            const removeTitle = state.lang === 'ru' ? 'Удалить валюту' : 'Remove currency';
            const variantsAriaLabel = state.lang === 'ru' ? `Варианты курса ${displayCode}` : `${displayCode} rate options`;

            let activePillLabel = '';
            if (isCustom) {
                const formattedRate = getCustomRateSnippet(customItem);
                activePillLabel = formattedRate || (state.lang === 'ru' ? 'Свой курс' : 'Custom');
            } else {
                activePillLabel = state.lang === 'ru' ? 'Биржевой' : 'Market';
            }

            let subHTML;
            if (isCustom && customItem && customItem.note) {
                subHTML = `<span class="c-name"><span class="custom-card-note">${escapeHTML(customItem.note)}</span> <span class="custom-card-subname">• ${escapeHTML(nameLocal)}</span></span>`;
            } else {
                subHTML = `<span class="c-name">${escapeHTML(nameLocal)}</span>`;
            }

            let variantsHTML = variants.map(v => {
                const isActive = v.id === code;
                let variantTitle;
                let variantSnippet;
                if (v.isMarket) {
                    variantTitle = state.lang === 'ru' ? 'Биржевой курс' : 'Market rate';
                    variantSnippet = getMarketRateSnippet(rootCode);
                } else {
                    variantTitle = v.note || (state.lang === 'ru' ? 'Свой курс' : 'Custom rate');
                    variantSnippet = getCustomRateSnippet(v.item || (state.customCurrencies && state.customCurrencies[v.id]));
                }

                return `
                    <div class="subgroup-item ${isActive ? 'is-active' : ''}" data-variant-id="${v.id}" role="radio" aria-checked="${isActive}">
                        <div class="subgroup-item-left">
                            <div class="subgroup-radio">
                                <div class="subgroup-radio-dot"></div>
                            </div>
                            <div class="subgroup-info">
                                <span class="subgroup-title">${escapeHTML(variantTitle)}</span>
                                ${variantSnippet ? `<span class="subgroup-rate-badge">${escapeHTML(variantSnippet)}</span>` : ''}
                            </div>
                        </div>
                        ${!v.isMarket ? `
                        <div class="subgroup-item-actions">
                            <button type="button" class="subgroup-edit-btn" data-edit-id="${v.id}" title="${state.lang === 'ru' ? 'Редактировать курс' : 'Edit rate'}" aria-label="Edit rate">✎</button>
                            <button type="button" class="subgroup-delete-btn" data-delete-id="${v.id}" title="${state.lang === 'ru' ? 'Удалить курс' : 'Delete rate'}" aria-label="Delete rate">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                                </svg>
                            </button>
                        </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

            item.innerHTML = `
                <div class="search-item-main-row" role="button" aria-expanded="${isExpanded}" title="${state.lang === 'ru' ? 'Нажмите, чтобы развернуть варианты курса' : 'Tap to toggle rate options'}">
                    <div class="search-item-left">
                        <span class="drag-handle">☰</span>
                        <div class="currency-meta">
                            <span class="flag">${dbItem.f || '💵'}</span>
                            <div class="code-name">
                                <div class="c-code-row">
                                    <span class="c-code">${displayCode}</span>
                                    <span class="subgroup-toggle-pill clickable-pill" title="${state.lang === 'ru' ? 'Варианты курса' : 'Rate options'}">
                                        <span>${escapeHTML(activePillLabel)}</span>
                                        <span class="toggle-arrow ${isExpanded ? 'is-expanded' : ''}">▾</span>
                                    </span>
                                </div>
                                ${subHTML}
                            </div>
                        </div>
                    </div>
                    <span class="action-icon" style="color:#ff453a; user-select:none;" title="${removeTitle}">−</span>
                </div>
                <div class="currency-subgroup" role="radiogroup" aria-label="${escapeHTML(variantsAriaLabel)}">
                    ${variantsHTML}
                    <button type="button" class="subgroup-btn-add" data-base-code="${rootCode}">
                        <span>➕</span>
                        <span>${state.lang === 'ru' ? 'Зафиксировать ещё курс...' : 'Lock another rate...'}</span>
                    </button>
                </div>
            `;

            // Expand/collapse on header row click
            const mainRow = item.querySelector('.search-item-main-row');
            mainRow.addEventListener('click', (e) => {
                if (e.target.closest('.drag-handle') || e.target.closest('.action-icon')) return;
                e.stopPropagation();

                const wasExpanded = expandedCurrencyRoots.has(rootCode);
                if (wasExpanded) {
                    expandedCurrencyRoots.delete(rootCode);
                    item.classList.add('is-collapsed');
                    mainRow.setAttribute('aria-expanded', 'false');
                    const arrow = item.querySelector('.toggle-arrow');
                    if (arrow) arrow.classList.remove('is-expanded');
                } else {
                    expandedCurrencyRoots.add(rootCode);
                    item.classList.remove('is-collapsed');
                    mainRow.setAttribute('aria-expanded', 'true');
                    const arrow = item.querySelector('.toggle-arrow');
                    if (arrow) arrow.classList.add('is-expanded');
                }
                if (typeof triggerHaptic === 'function') triggerHaptic(8);
            });

            // Remove entire currency (all variants) from favorites
            item.querySelector('.action-icon').addEventListener('click', (e) => {
                e.stopPropagation();
                expandedCurrencyRoots.delete(rootCode);
                toggleFavorite(rootCode, false);
            });

            // Select variant immediately on tap
            item.querySelectorAll('.subgroup-item').forEach(subRow => {
                subRow.addEventListener('click', (e) => {
                    if (e.target.closest('.subgroup-edit-btn') || e.target.closest('.subgroup-delete-btn')) return;
                    const targetVariantId = subRow.dataset.variantId;
                    expandedCurrencyRoots.add(rootCode);
                    if (typeof setCurrencyVariant === 'function') {
                        setCurrencyVariant(rootCode, targetVariantId, true);
                    }
                });
            });

            // Edit custom rate
            item.querySelectorAll('.subgroup-edit-btn').forEach(editBtn => {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const editId = editBtn.dataset.editId;
                    if (typeof openCustomRateModal === 'function') {
                        openCustomRateModal({ editId });
                    }
                });
            });

            // Delete custom rate immediately with undo
            item.querySelectorAll('.subgroup-delete-btn').forEach(delBtn => {
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const delId = delBtn.dataset.deleteId;
                    if (typeof deleteCustomRateWithUndo === 'function') {
                        deleteCustomRateWithUndo(delId);
                    } else if (typeof deleteCustomRate === 'function') {
                        deleteCustomRate(delId);
                    }
                });
            });

            // Add new custom rate for this base currency
            const addSubBtn = item.querySelector('.subgroup-btn-add');
            if (addSubBtn) {
                addSubBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    expandedCurrencyRoots.add(rootCode);
                    if (typeof openCustomRateModal === 'function') {
                        openCustomRateModal({ baseCode: rootCode });
                    }
                });
            }

            addedFragment.appendChild(item);
        } else {
            // Single variant currency (standard or pure standalone custom)
            const item = document.createElement('div');
            item.className = `search-item ${isCustom ? 'custom-search-item' : ''}`;
            item.dataset.code = code;
            item.draggable = true;

            if (isCustom) {
                const rateText = getCustomRateSnippet(customItem);
                let subHTML;
                if (customItem.note) {
                    subHTML = `<span class="custom-card-note">${escapeHTML(customItem.note)}</span> <span class="custom-card-subname">• ${escapeHTML(nameLocal)}</span>`;
                } else {
                    subHTML = `<span class="custom-card-subname">${escapeHTML(nameLocal)}</span>`;
                }

                item.innerHTML = `
                    <div class="search-item-left">
                        <span class="drag-handle">☰</span>
                        <div class="currency-meta" style="flex-grow:1;">
                            <span class="flag">${customItem.flag || '🏷️'}</span>
                            <div class="code-name">
                                <div class="c-code-row">
                                    <span class="c-code">${displayCode}</span>
                                    ${rateText ? `<span class="custom-list-pill">${escapeHTML(rateText)}</span>` : ''}
                                </div>
                                <span class="c-name">${subHTML}</span>
                            </div>
                        </div>
                    </div>
                    <div class="search-item-actions">
                        <button type="button" class="search-item-btn edit-custom-btn" title="${state.lang === 'ru' ? 'Редактировать курс' : 'Edit rate'}">✎</button>
                        <button type="button" class="search-item-btn delete-custom-btn" title="${state.lang === 'ru' ? 'Удалить курс' : 'Delete rate'}">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                        </button>
                        <span class="action-icon" style="color:#ff453a; user-select:none;">−</span>
                    </div>
                `;

                item.querySelector('.edit-custom-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof openCustomRateModal === 'function') {
                        openCustomRateModal({ editId: code });
                    }
                });

                item.querySelector('.delete-custom-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof deleteCustomRateWithUndo === 'function') {
                        deleteCustomRateWithUndo(code);
                    } else if (typeof deleteCustomRate === 'function') {
                        deleteCustomRate(code);
                    }
                });
            } else {
                item.innerHTML = `
                    <div class="search-item-left">
                        <span class="drag-handle">☰</span>
                        <div class="currency-meta" style="flex-grow:1;">
                            <span class="flag">${dbItem.f || '💵'}</span>
                            <div class="code-name">
                                <span class="c-code">${code}</span>
                                <span class="c-name">${escapeHTML(nameLocal)}</span>
                            </div>
                        </div>
                    </div>
                    <span class="action-icon" style="color:#ff453a; user-select:none;">−</span>
                `;
            }

            item.querySelector('.action-icon').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(rootCode, false);
            });

            addedFragment.appendChild(item);
        }
    });

    // ============================================================
    // 2. "ДОСТУПНО ДЛЯ ДОБАВЛЕНИЯ" (AVAILABLE CURRENCIES)
    // ============================================================

    // A. Standalone custom currencies (with no registered entry in currencyDb)
    if (state.customCurrencies) {
        Object.keys(state.customCurrencies).forEach(id => {
            const customItem = state.customCurrencies[id];
            if (!customItem) return;
            // If baseCode exists in currencyDb, this custom rate belongs under that currency in currencyDb
            if (customItem.baseCode && currencyDb && currencyDb[customItem.baseCode]) return;

            const rootCode = typeof getCurrencyRootCode === 'function' ? getCurrencyRootCode(id) : id;
            if (isCurrencyInFavorites(rootCode)) return;

            const dbItem = { f: customItem.flag || '🏷️' };
            if (!matchesQuery(id, dbItem, query)) return;

            const displayCode = customItem.code || 'CUSTOM';
            const nameLocal = getCurrencyName(id);
            const rateSnippet = getCustomRateSnippet(customItem);

            let subHTML = `<span class="custom-card-subname">${escapeHTML(nameLocal)}</span>`;
            if (customItem.note) {
                subHTML = `<span class="custom-card-note">${escapeHTML(customItem.note)}</span> <span class="custom-card-subname">• ${escapeHTML(nameLocal)}</span>`;
            }

            const item = document.createElement('div');
            item.className = 'search-item clickable custom-search-item';
            item.innerHTML = `
                <div class="currency-meta">
                    <span class="flag">${customItem.flag || '🏷️'}</span>
                    <div class="code-name">
                        <div class="c-code-row">
                            <span class="c-code">${displayCode}</span>
                            ${rateSnippet ? `<span class="custom-list-pill">${escapeHTML(rateSnippet)}</span>` : ''}
                        </div>
                        <span class="c-name">${subHTML}</span>
                    </div>
                </div>
                <div class="search-item-actions">
                    <button type="button" class="search-item-btn edit-custom-btn" title="${state.lang === 'ru' ? 'Редактировать курс' : 'Edit rate'}">✎</button>
                    <button type="button" class="search-item-btn delete-custom-btn" title="${state.lang === 'ru' ? 'Удалить курс' : 'Delete rate'}">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                    </button>
                    <span class="action-icon" style="color:var(--accent);">+</span>
                </div>
            `;

            item.querySelector('.edit-custom-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof openCustomRateModal === 'function') {
                    openCustomRateModal({ editId: id });
                }
            });

            item.querySelector('.delete-custom-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof deleteCustomRateWithUndo === 'function') {
                    deleteCustomRateWithUndo(id);
                } else if (typeof deleteCustomRate === 'function') {
                    deleteCustomRate(id);
                }
            });

            item.addEventListener('click', (e) => {
                if (e.target.closest('.search-item-actions')) return;
                toggleFavorite(id, true);
            });

            availableFragment.appendChild(item);
        });
    }

    // B. Unified currencies from currencyDb (strictly excluded if in favorites)
    Object.keys(currencyDb).forEach(code => {
        if (isCurrencyInFavorites(code)) return;
        const dbItem = currencyDb[code];
        const nameLocal = getCurrencyName(code);
        if (!matchesQuery(code, dbItem, query)) return;

        const variants = typeof getCurrencyVariants === 'function' ? getCurrencyVariants(code) : [];
        const customVariantsCount = variants.filter(v => !v.isMarket).length;

        const item = document.createElement('div');
        const hasRate = !!state.rates[code];
        item.className = `search-item clickable ${!hasRate ? 'no-rate-available' : ''}`;

        let nameHTML = `<span class="c-name">${escapeHTML(nameLocal)}</span>`;
        if (customVariantsCount > 0) {
            const countText = state.lang === 'ru'
                ? `${customVariantsCount} ${customVariantsCount === 1 ? 'свой курс' : 'своих курса'}`
                : `${customVariantsCount} custom`;
            nameHTML = `<span class="c-name">${escapeHTML(nameLocal)} <span class="available-custom-badge">• ${countText}</span></span>`;
        }

        const badgeHTML = hasRate ? '' : `<span style="font-size:0.7rem; background: var(--border); padding:2px 6px; border-radius:4px; margin-right:8px; color:var(--text-muted)">?</span>`;

        item.innerHTML = `
            <div class="currency-meta">
                <span class="flag">${dbItem.f || '💵'}</span>
                <div class="code-name">
                    <span class="c-code">${code}</span>
                    ${nameHTML}
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
    permanentFavorites = [...state.favorites];
    saveState();
    renderMain();
}

/**
 * Attaches modal opening and search input handlers.
 */
function setupManageListEvents() {
    const addBtn = document.getElementById('ui-add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            if (isClosingKeypad || (Date.now() - lastCloseKeypadTime < 420)) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            openModal(e);
        });
    }

    const closeBtn = document.getElementById('ui-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    const searchBar = document.getElementById('search-bar');
    if (searchBar) searchBar.addEventListener('input', filterCurrencies);

    const customRateBtn = document.getElementById('btn-open-custom-rate');
    if (customRateBtn) {
        customRateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof openCustomRateModal === 'function') {
                openCustomRateModal();
            }
        });
    }
}
