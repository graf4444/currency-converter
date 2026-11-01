// ============================================================
// PWA QUICK ACTIONS & SHORTCUTS HANDLER
// Handles application launch via desktop & home screen shortcuts:
// - Popular currency pairs (e.g. ?from=USD&to=EUR, ?from=USD&to=RUB)
// - Quick Calculator (?action=calc)
// - Currency Search & Add (?action=search)
// 
// QUICK MODE RESTRICTIONS:
// In quick currency pair mode:
// - Currency list customization is completely disabled and hidden.
// - Modals to edit currencies cannot be opened.
// - User's permanent custom currency list in localStorage is protected and NOT overwritten.
// - Changing theme or language is fully allowed and persists to localStorage.
// - An exit button ("Показать все валюты") allows returning to normal mode at any time.
// ============================================================

/**
 * Exits Quick Mode or Link Session and restores the user's permanent currency list and controls.
 */
function exitQuickMode() {
    if (!isQuickMode && !isLinkSession) return;
    isQuickMode = false;
    isLinkSession = false;

    if (Array.isArray(permanentFavorites) && permanentFavorites.length > 0) {
        state.favorites = [...permanentFavorites];
    }

    // Clean up temporary shared session custom currencies if any
    if (state.customCurrencies) {
        let changed = false;
        Object.keys(state.customCurrencies).forEach(id => {
            if (state.customCurrencies[id] && state.customCurrencies[id].isSharedSession) {
                delete state.customCurrencies[id];
                changed = true;
            }
        });
        if (changed && typeof recomputeCustomRates === 'function') {
            recomputeCustomRates();
        }
    }

    const addBtn = document.getElementById('ui-add-btn');
    if (addBtn) addBtn.style.display = '';

    const exitBtn = document.getElementById('ui-exit-quick-mode-btn');
    if (exitBtn) exitBtn.remove();

    renderMain();
}

/**
 * Renders or updates the "Show All Currencies" button in place of the customize button.
 */
function renderQuickModeControls() {
    const addBtn = document.getElementById('ui-add-btn');
    if (addBtn) addBtn.style.display = 'none';

    let exitBtn = document.getElementById('ui-exit-quick-mode-btn');
    if (!exitBtn) {
        exitBtn = document.createElement('button');
        exitBtn.id = 'ui-exit-quick-mode-btn';
        exitBtn.className = 'add-btn quick-mode-btn';
        exitBtn.type = 'button';

        if (addBtn && addBtn.parentNode) {
            addBtn.parentNode.insertBefore(exitBtn, addBtn.nextSibling);
        }

        exitBtn.addEventListener('click', () => {
            exitQuickMode();
        });
    }

    const t = (typeof i18n !== 'undefined' && i18n[state.lang]) ? i18n[state.lang] : null;
    exitBtn.textContent = (t && t.showAll) ? t.showAll : 'Show All Currencies';
    exitBtn.style.display = '';
}

/**
 * Parses URL query parameters when launching from a PWA shortcut
 * and opens the requested view or enters Quick Mode.
 */
function handleAppShortcuts() {
    if (!window.location.search) return;

    try {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const from = params.get('from') || params.get('currency') || params.get('code');
        const to = params.get('to');
        const amount = params.get('amount') || params.get('val');

        let handled = false;

        // 1. Quick Currency Pair Mode (e.g. ?from=USD&to=RUB) or Deep Link (?from=USD&amount=100)
        if (from) {
            const rawFrom = from.trim();
            const fromUpper = rawFrom.toUpperCase();
            const toCode = to ? to.toUpperCase().trim() : null;

            // Check if from matches an existing custom currency in user's state
            let matchedCustomId = null;
            if (state.customCurrencies) {
                if (state.customCurrencies[rawFrom]) {
                    matchedCustomId = rawFrom;
                } else {
                    matchedCustomId = Object.keys(state.customCurrencies).find(id => id.toUpperCase() === fromUpper) || null;
                }
            }

            // Check for custom rate in URL params
            const paramRate = params.get('rate') || params.get('customRate');
            const paramRateTo = (params.get('rateTo') || params.get('target') || 'RUB').toUpperCase().trim();
            const paramNote = params.get('note') || '';
            const paramName = params.get('name') || '';
            const paramDir = params.get('dir') || 'direct';
            const paramFlag = params.get('flag') || '';

            let effectiveFromCode = null;

            if (matchedCustomId) {
                effectiveFromCode = matchedCustomId;
            } else if (paramRate && !isNaN(parseFloat(paramRate)) && parseFloat(paramRate) > 0) {
                // Shared custom rate via URL
                const rateVal = parseFloat(paramRate);
                const codeName = fromUpper;
                const isKnown = typeof currencyDb !== 'undefined' && currencyDb[codeName];

                // See if user already has an identical custom rate
                let existingId = null;
                if (state.customCurrencies) {
                    existingId = Object.keys(state.customCurrencies).find(id => {
                        const c = state.customCurrencies[id];
                        return (c.baseCode === codeName || c.code === codeName) &&
                               Math.abs(parseFloat(c.rateValue) - rateVal) < 0.0001 &&
                               (c.rateCurrency || '').toUpperCase() === paramRateTo;
                    });
                }

                if (existingId) {
                    effectiveFromCode = existingId;
                } else {
                    const tempId = `cust_shared_${codeName}_${Date.now().toString(36)}`;
                    if (!state.customCurrencies) state.customCurrencies = {};
                    const baseItem = isKnown ? currencyDb[codeName] : { f: paramFlag || '🏷️' };
                    state.customCurrencies[tempId] = {
                        id: tempId,
                        baseCode: isKnown ? codeName : null,
                        code: codeName,
                        flag: paramFlag || baseItem.f || '🏷️',
                        name: paramName || ((isKnown && typeof getCurrencyName === 'function') ? getCurrencyName(codeName) : codeName),
                        note: paramNote,
                        rateValue: rateVal,
                        rateCurrency: paramRateTo,
                        rateDirection: paramDir,
                        isCustom: true,
                        isSharedSession: true,
                        updatedAt: Date.now()
                    };
                    if (typeof recomputeCustomRates === 'function') {
                        recomputeCustomRates();
                    }
                    effectiveFromCode = tempId;
                }
            } else if (typeof currencyDb !== 'undefined' && currencyDb[fromUpper]) {
                effectiveFromCode = fromUpper;
            } else if (rawFrom.startsWith('cust_')) {
                // Fallback for raw cust_... ID if custom currency is missing: extract base code e.g. cust_USD_... -> USD
                const m = rawFrom.match(/^cust_(?:new_)?([a-zA-Z0-9]+)/);
                if (m) {
                    const parsed = m[1].toUpperCase();
                    if (typeof currencyDb !== 'undefined' && currencyDb[parsed]) {
                        effectiveFromCode = parsed;
                    }
                }
            }

            if (effectiveFromCode) {
                if (!Array.isArray(permanentFavorites) || permanentFavorites.length === 0) {
                    permanentFavorites = [...state.favorites];
                }

                if (toCode && (currencyDb[toCode] || (state.customCurrencies && state.customCurrencies[toCode])) && toCode !== effectiveFromCode) {
                    // Quick Currency Pair Mode (e.g. PWA shortcut)
                    isQuickMode = true;
                    isLinkSession = false;
                    state.favorites = [effectiveFromCode, toCode];
                    renderQuickModeControls();
                } else {
                    // Deep Link with base currency & amount:
                    // Display effectiveFromCode at top for this session without altering localStorage
                    isLinkSession = true;
                    isQuickMode = false;
                    state.favorites = [effectiveFromCode, ...permanentFavorites.filter(c => c !== effectiveFromCode)];
                    renderQuickModeControls();
                }

                currentInputCode = effectiveFromCode;
                currentInputValue = amount ? String(amount) : '1';

                renderMain();
                if (typeof recalculate === 'function') {
                    recalculate(effectiveFromCode, currentInputValue);
                }

                const inputEl = document.getElementById(`input-${effectiveFromCode}`);
                if (inputEl) {
                    if (isTouchDevice()) {
                        openVirtualKeypad(inputEl);
                    } else {
                        inputEl.focus({ preventScroll: true });
                        const len = inputEl.value.length;
                        inputEl.setSelectionRange(len, len);
                    }
                }
                handled = true;
            }
        }

        // 2. Calculator shortcut (?action=calc)
        if (action === 'calc' || action === 'calculator') {
            const targetCode = currentInputCode || (state.favorites && state.favorites[0]) || 'USD';
            currentInputCode = targetCode;
            if (!currentInputValue || currentInputValue.trim() === '') {
                currentInputValue = '1';
            }

            const activeInput = document.getElementById(`input-${targetCode}`);
            if (activeInput) {
                activeInput.value = formatExpression(currentInputValue);
                adjustFontSize(activeInput);
                const clearBtn = document.getElementById(`clear-${targetCode}`);
                if (clearBtn) clearBtn.classList.add('visible');
            }
            recalculate(targetCode, currentInputValue);

            const inputEl = document.getElementById(`input-${targetCode}`);
            if (inputEl) {
                const card = inputEl.closest('.currency-card');
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }

                if (isTouchDevice()) {
                    openVirtualKeypad(inputEl);
                } else {
                    inputEl.focus({ preventScroll: true });
                    const len = inputEl.value.length;
                    inputEl.setSelectionRange(len, len);
                }
            }
            handled = true;
        }

        // 3. Search and Add Currency shortcut (?action=search)
        if (action === 'search') {
            openModal();
            const searchBar = document.getElementById('search-bar');
            if (searchBar) {
                setTimeout(() => {
                    searchBar.focus();
                }, 60);
            }
            handled = true;
        }

        // Clean up URL query parameters so page refresh doesn't trigger shortcut repeatedly
        if (handled) {
            const cleanUrl = window.location.pathname + window.location.hash;
            try {
                window.history.replaceState({ page: 'app' }, '', cleanUrl);
            } catch (_) {}
        }
    } catch (err) {
        console.error('Error handling PWA shortcut:', err);
    }
}
