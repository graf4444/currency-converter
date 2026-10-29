// ============================================================
// CURRENCY SELECTION & DRAG-AND-DROP REORDERING
// Multilingual search modal, favorites toggling, and touch reordering.
// ============================================================

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
    permanentFavorites = [...state.favorites];
    saveState();
    renderMain();
    filterCurrencies();
}

function matchesQuery(code, dbItem, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    if (code.toLowerCase().includes(q)) return true;
    if (typeof state !== 'undefined' && state.customCurrencies && state.customCurrencies[code]) {
        const c = state.customCurrencies[code];
        if (c.code && c.code.toLowerCase().includes(q)) return true;
        if (c.baseCode && c.baseCode.toLowerCase().includes(q)) return true;
        if (c.name && c.name.toLowerCase().includes(q)) return true;
        if (c.note && c.note.toLowerCase().includes(q)) return true;
        if (c.rateValue && String(c.rateValue).includes(q)) return true;
        if (c.rateCurrency && c.rateCurrency.toLowerCase().includes(q)) return true;
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

    const addedFragment = document.createDocumentFragment();
    const availableFragment = document.createDocumentFragment();

    state.favorites = [...new Set(state.favorites.filter(Boolean))];

    state.favorites.forEach(code => {
        const isCustom = Boolean(state.customCurrencies && state.customCurrencies[code]);
        const customItem = isCustom ? state.customCurrencies[code] : null;

        const dbItem = isCustom 
            ? { f: customItem.flag || '🏷️' } 
            : (currencyDb[code] || { f: "🏳️" });

        if (!matchesQuery(code, dbItem, query)) return;

        const item = document.createElement('div');
        item.className = `search-item ${isCustom ? 'custom-search-item' : ''}`;
        item.dataset.code = code;
        item.draggable = true;

        if (isCustom) {
            const displayCode = customItem.baseCode || customItem.code || 'CUSTOM';
            const nameLocal = getCurrencyName(code);
            const targetSymbol = typeof getCurrencySymbol === 'function' 
                ? getCurrencySymbol(customItem.rateCurrency || 'USD') 
                : (customItem.rateCurrency || 'USD');
            const rateText = customItem.rateDirection === 'reverse'
                ? `1 ${targetSymbol} = ${customItem.rateValue} ${displayCode}`
                : `${customItem.rateValue} ${targetSymbol}`;
            const noteText = customItem.note ? ` • ${customItem.note}` : '';

            item.innerHTML = `
                <div class="search-item-left">
                    <span class="drag-handle">☰</span>
                    <div class="currency-meta" style="flex-grow:1;">
                        <span class="flag">${customItem.flag || '🏷️'}</span>
                        <div class="code-name">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <span class="c-code">${displayCode}</span>
                                <span class="custom-list-pill">${rateText}</span>
                            </div>
                            <span class="c-name">${nameLocal}${escapeHTML(noteText)}</span>
                        </div>
                    </div>
                </div>
                <div class="search-item-actions">
                    <button type="button" class="search-item-btn edit-custom-btn" title="${state.lang === 'ru' ? 'Редактировать курс' : 'Edit rate'}">✎</button>
                    <span class="action-icon" style="color:#ff453a; user-select:none;">−</span>
                </div>
            `;
            item.querySelector('.edit-custom-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof openCustomRateModal === 'function') {
                    openCustomRateModal({ editId: code });
                }
            });
        } else {
            const nameLocal = getCurrencyName(code);
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
        }

        item.querySelector('.action-icon').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(code, false);
        });
        addedFragment.appendChild(item);
    });

    // Custom currencies that are not currently in favorites
    if (state.customCurrencies) {
        Object.keys(state.customCurrencies).forEach(id => {
            if (state.favorites.includes(id)) return;
            const customItem = state.customCurrencies[id];
            if (!customItem) return;

            const dbItem = { f: customItem.flag || '🏷️' };
            if (!matchesQuery(id, dbItem, query)) return;

            const displayCode = customItem.baseCode || customItem.code || 'CUSTOM';
            const nameLocal = getCurrencyName(id);
            const targetSymbol = typeof getCurrencySymbol === 'function' 
                ? getCurrencySymbol(customItem.rateCurrency || 'USD') 
                : (customItem.rateCurrency || 'USD');
            const rateText = customItem.rateDirection === 'reverse'
                ? `1 ${targetSymbol} = ${customItem.rateValue} ${displayCode}`
                : `${customItem.rateValue} ${targetSymbol}`;
            const noteText = customItem.note ? ` • ${customItem.note}` : '';

            const item = document.createElement('div');
            item.className = 'search-item clickable custom-search-item';
            item.innerHTML = `
                <div class="currency-meta">
                    <span class="flag">${customItem.flag || '🏷️'}</span>
                    <div class="code-name">
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span class="c-code">${displayCode}</span>
                            <span class="custom-list-pill">${rateText}</span>
                        </div>
                        <span class="c-name">${nameLocal}${escapeHTML(noteText)}</span>
                    </div>
                </div>
                <div class="search-item-actions">
                    <button type="button" class="search-item-btn edit-custom-btn" title="${state.lang === 'ru' ? 'Редактировать курс' : 'Edit rate'}">✎</button>
                    <span class="action-icon" style="color:var(--accent);">+</span>
                </div>
            `;
            item.querySelector('.edit-custom-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof openCustomRateModal === 'function') {
                    openCustomRateModal({ editId: id });
                }
            });
            item.addEventListener('click', (e) => {
                if (e.target.closest('.edit-custom-btn')) return;
                toggleFavorite(id, true);
            });
            availableFragment.appendChild(item);
        });
    }

    // Standard currencies from currencyDb
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
