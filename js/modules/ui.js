// ============================================================
// UI RENDERING, THEME & LOCALIZATION CONTROLLER
// Main currency cards renderer, dynamic inputs, themes, and translations.
// ============================================================

function getCurrencyName(code) {
    if (typeof state !== 'undefined' && state.customCurrencies && state.customCurrencies[code]) {
        const item = state.customCurrencies[code];
        if (item.baseCode && typeof currencyDb !== 'undefined' && currencyDb[item.baseCode]) {
            const baseItem = currencyDb[item.baseCode];
            return (baseItem.n && (baseItem.n[state.lang] || baseItem.n['en'])) || item.baseCode;
        }
        return item.name || item.code || code;
    }
    if (typeof currencyDb === 'undefined' || !currencyDb[code]) return code;
    const item = currencyDb[code];
    return item.n[state.lang] || item.n['en'] || code;
}

function updateLastUpdateUI() {
    const lastUpdateEl = document.getElementById('last-update');
    if (!lastUpdateEl) return;
    const t = (typeof i18n !== 'undefined' && i18n[state.lang]) ? i18n[state.lang] : { updated: 'Updated: ' };
    lastUpdateEl.textContent = state.lastUpdated ? `${t.updated} ${state.lastUpdated}` : '';
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

    const langPicker = document.getElementById('lang-picker');
    if (langPicker) {
        langPicker.value = state.lang;
        langPicker.setAttribute('aria-label', t.selectLanguage || 'Select Language');
    }

    const themeToggle = document.getElementById('theme-btn') || document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.setAttribute('aria-label', t.toggleTheme || 'Toggle theme');
    }

    const githubLink = document.querySelector('.github-link');
    if (githubLink) {
        githubLink.setAttribute('aria-label', state.lang === 'ru' ? 'Исходный код на GitHub' : 'View source on GitHub');
    }

    const btnAdd = document.getElementById('ui-add-btn');
    if (btnAdd) btnAdd.textContent = t.add;
    
    const modalTitle = document.getElementById('ui-modal-title');
    if (modalTitle) modalTitle.textContent = t.searchTitle;
    
    const btnClose = document.getElementById('ui-close-btn');
    if (btnClose) btnClose.textContent = t.close;
    
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        searchBar.placeholder = t.searchPlaceholder;
        searchBar.setAttribute('aria-label', t.searchPlaceholder);
    }
    
    const secAdded = document.getElementById('ui-section-added');
    if (secAdded) secAdded.textContent = t.secAdded;
    
    const secAvail = document.getElementById('ui-section-available');
    if (secAvail) secAvail.textContent = t.secAvailable;

    const hideLabel = document.getElementById('ui-keypad-hide-label');
    if (hideLabel) hideLabel.textContent = t.hideKeypad || 'Скрыть';

    const exitBtn = document.getElementById('ui-exit-quick-mode-btn');
    if (exitBtn) exitBtn.textContent = t.showAll || 'Show All Currencies';

    const footerInstallTxt = document.getElementById('ui-footer-install-text');
    if (footerInstallTxt) {
        footerInstallTxt.textContent = t.installApp || 'Install App';
    }

    const modalInstallTitle = document.getElementById('ui-install-modal-title');
    if (modalInstallTitle) {
        modalInstallTitle.textContent = t.installTitle || 'Install Application';
    }

    const modalInstallDesc = document.getElementById('ui-install-modal-desc');
    if (modalInstallDesc) {
        modalInstallDesc.textContent = t.installDesc || 'Install to your home screen for quick access and offline use:';
    }

    if (typeof renderInstallSteps === 'function') {
        renderInstallSteps();
    }

    if (typeof renderPrivacyContent === 'function') {
        renderPrivacyContent();
    }

    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.setAttribute('aria-label', t.closeModal || (state.lang === 'ru' ? 'Закрыть' : 'Close'));
    });

    const btnCustomTitle = document.getElementById('ui-btn-custom-title');
    if (btnCustomTitle) btnCustomTitle.textContent = t.customRateCardTitle || (state.lang === 'ru' ? 'Добавить свой курс' : 'Add custom rate');

    const btnCustomSub = document.getElementById('ui-btn-custom-sub');
    if (btnCustomSub) btnCustomSub.textContent = t.customRateCardSub || (state.lang === 'ru' 
        ? 'Курс покупки в обменнике, банке или своя валюта' 
        : 'Cash purchase, bank exchange or custom currency');

    const modalCustomTitle = document.getElementById('ui-custom-modal-title');
    if (modalCustomTitle && !currentEditCustomId) {
        modalCustomTitle.textContent = t.customRateTitle || (state.lang === 'ru' ? 'Фиксация курса' : 'Lock Exchange Rate');
    }

    const customBaseBtn = document.getElementById('custom-base-btn');
    if (customBaseBtn) customBaseBtn.setAttribute('title', t.baseCurrency || 'Base Currency');

    const customTargetBtn = document.getElementById('custom-target-btn');
    if (customTargetBtn) customTargetBtn.setAttribute('title', t.targetCurrency || 'Target Currency');

    const baseSearch = document.getElementById('base-picker-search');
    if (baseSearch) baseSearch.placeholder = t.searchPlaceholder || 'Search...';

    const targetSearch = document.getElementById('target-picker-search');
    if (targetSearch) targetSearch.placeholder = t.searchPlaceholder || 'Search...';

    const lblRate = document.getElementById('ui-lbl-rate-calc');
    if (lblRate) lblRate.textContent = t.exchangeRate || (state.lang === 'ru' ? 'Ваш курс' : 'Your Rate');

    const btnUseMarket = document.getElementById('btn-use-market-rate');
    if (btnUseMarket) btnUseMarket.textContent = t.useMarket || (state.lang === 'ru' ? 'Подставить' : 'Use Market');

    const lblNote = document.getElementById('ui-lbl-note');
    if (lblNote) lblNote.textContent = t.noteLabel || (state.lang === 'ru' ? 'Примечание' : 'Note');

    const inputNote = document.getElementById('custom-note-input');
    if (inputNote) inputNote.placeholder = t.notePlaceholder || (state.lang === 'ru' ? 'Например: Наличные для отпуска' : 'e.g., Vacation cash');

    const noteChips = document.querySelectorAll('.note-chip');
    const chipPresets = t.noteChips || (state.lang === 'ru' 
        ? ['Отпуск', 'Обменник', 'Банк', 'Зарплата'] 
        : ['Vacation', 'Exchange', 'Bank', 'Salary']);
    noteChips.forEach((chip, idx) => {
        if (chipPresets[idx]) {
            chip.textContent = chipPresets[idx];
            chip.dataset.note = chipPresets[idx];
        }
    });

    const lblNewCode = document.getElementById('ui-lbl-new-code');
    if (lblNewCode) lblNewCode.textContent = t.newCode || (state.lang === 'ru' ? 'Код' : 'Code');

    const lblNewName = document.getElementById('ui-lbl-new-name');
    if (lblNewName) lblNewName.textContent = t.newName || (state.lang === 'ru' ? 'Название' : 'Name');

    const newCurrNameInput = document.getElementById('new-curr-name');
    if (newCurrNameInput) newCurrNameInput.placeholder = t.newCurrPlaceholder || (state.lang === 'ru' ? 'Бонусные баллы' : 'e.g., Points / Miles');

    const noticeLocalDesc = document.getElementById('ui-notice-local-desc');
    if (noticeLocalDesc) noticeLocalDesc.textContent = t.noticeLocalDesc || (state.lang === 'ru' ? '🔒 Сохраняется только на этом устройстве' : '🔒 Saved only on this device');

    const btnSaveCustom = document.getElementById('btn-save-custom');
    if (btnSaveCustom) btnSaveCustom.textContent = t.saveRate || (state.lang === 'ru' ? 'Сохранить' : 'Save');

    const btnDeleteCustom = document.getElementById('btn-delete-custom');
    if (btnDeleteCustom) btnDeleteCustom.textContent = t.deleteRate || (state.lang === 'ru' ? 'Удалить' : 'Delete');

    const btnCancelCustom = document.getElementById('btn-cancel-custom');
    if (btnCancelCustom) btnCancelCustom.textContent = t.cancel || (state.lang === 'ru' ? 'Отмена' : 'Cancel');

    const btnVariantAddText = document.getElementById('btn-variant-add-text');
    if (btnVariantAddText) btnVariantAddText.textContent = t.btnVariantAddCustom || (state.lang === 'ru' ? 'Добавить свой курс...' : 'Add custom rate...');

    // Virtual Keypad elements
    const keypad = document.getElementById('virtual-keypad');
    if (keypad) keypad.setAttribute('aria-label', t.calculatorKeypad || 'Calculator keypad');

    const keypadShare = document.getElementById('keypad-share');
    if (keypadShare) {
        keypadShare.setAttribute('title', t.shareBreakdown || 'Share Breakdown');
        keypadShare.setAttribute('aria-label', t.shareBreakdown || 'Share Breakdown');
    }

    const keypadClose = document.getElementById('keypad-close');
    if (keypadClose) keypadClose.setAttribute('title', t.closeModal || 'Close Keypad');

    const keypadHideBtn = document.getElementById('keypad-hide-btn');
    if (keypadHideBtn) keypadHideBtn.setAttribute('title', t.hideKeypadTitle || 'Hide keypad');

    const backspaceKey = document.querySelector('.key-btn[data-key="BACKSPACE"]');
    if (backspaceKey) backspaceKey.setAttribute('title', t.clear || 'Clear');

    // Smart paste banner
    const smartPasteHint = document.getElementById('smart-paste-hint');
    if (smartPasteHint) smartPasteHint.textContent = t.clipboardHint || 'Paste from clipboard?';

    const smartPasteApply = document.getElementById('smart-paste-apply');
    if (smartPasteApply) smartPasteApply.textContent = t.pasteAction || 'Paste';

    const smartPasteInfo = document.getElementById('smart-paste-info');
    if (smartPasteInfo) {
        smartPasteInfo.setAttribute('title', t.clipboardSecurity || 'Security');
        smartPasteInfo.setAttribute('aria-label', t.clipboardSecurityAria || 'About clipboard security');
    }

    const smartPasteDismiss = document.getElementById('smart-paste-dismiss');
    if (smartPasteDismiss) smartPasteDismiss.setAttribute('aria-label', t.closeModal || 'Close');

    renderAppVersion();
    updateLastUpdateUI();
    if (typeof updateOnlineStatusUI === 'function') {
        updateOnlineStatusUI(false);
    }
}

function renderAppVersion() {
    const versionEl = document.getElementById('app-version');
    if (!versionEl) return;
    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.version) {
        const buildInfo = APP_CONFIG.buildTime ? ` (${APP_CONFIG.buildTime})` : '';
        versionEl.textContent = `v${APP_CONFIG.version}${buildInfo}`;
    }
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.body.setAttribute('data-theme', state.theme);
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        if (state.theme === 'gold') {
            themeBtn.textContent = '👑';
            themeBtn.setAttribute('title', 'Gold VIP Edition');
            themeBtn.setAttribute('aria-label', 'Gold VIP Edition');
        } else {
            themeBtn.textContent = state.theme === 'dark' ? '☀️' : '🌙';
            themeBtn.setAttribute('title', state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
            themeBtn.setAttribute('aria-label', state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
        }
    }
}

function updatePWAManifest() {
    const lang = (state && state.lang && typeof i18n !== 'undefined' && i18n[state.lang]) ? state.lang : 'en';
    const themeColor = state.theme === 'dark' ? '#1c1c1e' : (state.theme === 'gold' ? '#000000' : '#f2f2f7');

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', themeColor);
    }

    const manifestLink = document.getElementById('app-manifest') || document.getElementById('dynamic-manifest');
    if (manifestLink) {
        manifestLink.href = `./manifests/${lang}.json`;
    }
}

/**
 * Updates existing currency card inputs and pills in-place without rebuilding the DOM.
 * Returns true if successfully updated in-place, or false if the DOM structure differs
 * from state.favorites and requires a full renderMain().
 */
function updateCardsInPlace() {
    const container = document.getElementById('favorites-container');
    if (!container) return false;

    const cards = container.querySelectorAll('.currency-card');
    if (cards.length !== state.favorites.length) return false;

    for (let i = 0; i < state.favorites.length; i++) {
        const input = cards[i].querySelector('.currency-input');
        if (!input || input.dataset.code !== state.favorites[i]) {
            return false;
        }
    }

    const t = (typeof i18n !== 'undefined' && i18n[state.lang]) ? i18n[state.lang] : i18n['en'];

    cards.forEach(card => {
        const input = card.querySelector('.currency-input');
        if (!input) return;
        const code = input.dataset.code;
        const hasRate = !!(state.rates && state.rates[code]);
        const placeholderText = hasRate ? '0' : (t.noRate || (state.lang === 'ru' ? 'Нет курса' : 'No rate'));

        if (input.placeholder !== placeholderText) input.placeholder = placeholderText;
        input.disabled = !hasRate;

        const pill = card.querySelector('.custom-rate-pill');
        if (pill && state.customCurrencies && state.customCurrencies[code]) {
            const customItem = state.customCurrencies[code];
            const baseSymbol = typeof getCurrencySymbol === 'function'
                ? getCurrencySymbol(customItem.baseCode || customItem.code || 'CUSTOM')
                : (customItem.baseCode || customItem.code || 'CUSTOM');
            const targetSymbol = typeof getCurrencySymbol === 'function'
                ? getCurrencySymbol(customItem.rateCurrency || 'USD')
                : (customItem.rateCurrency || 'USD');
            const formattedRate = typeof formatNumberString === 'function'
                ? formatNumberString(String(customItem.rateValue))
                : String(customItem.rateValue);

            const pillPrefix = customItem.rateDirection === 'reverse'
                ? `1 ${targetSymbol} = `
                : `1 ${baseSymbol} = `;
            const pillVal = customItem.rateDirection === 'reverse'
                ? `${formattedRate} ${baseSymbol}`
                : `${formattedRate} ${targetSymbol}`;

            const prefixEl = pill.querySelector('.custom-rate-pill-prefix');
            const valEl = pill.querySelector('.custom-rate-pill-val');
            if (prefixEl && prefixEl.textContent !== pillPrefix) prefixEl.textContent = pillPrefix;
            if (valEl && valEl.textContent !== pillVal) valEl.textContent = pillVal;
        }
    });

    if (currentInputCode && currentInputValue !== '') {
        recalculate(currentInputCode, currentInputValue);
    }

    return true;
}

/**
 * Main DOM renderer for currency converter cards.
 */
function renderMain() {
    const container = document.getElementById('favorites-container');
    if (!container) return;
    
    const t = (typeof i18n !== 'undefined' && i18n[state.lang]) ? i18n[state.lang] : i18n['en'];
    const fragment = document.createDocumentFragment();

    state.favorites.forEach(code => {
        const isCustom = Boolean(state.customCurrencies && state.customCurrencies[code]);
        const customItem = isCustom ? state.customCurrencies[code] : null;

        const rootCode = typeof getCurrencyRootCode === 'function' ? getCurrencyRootCode(code) : code;
        const variants = typeof getCurrencyVariants === 'function' ? getCurrencyVariants(rootCode) : [];
        const hasMultipleVariants = variants.length > 1;

        let dbItem;
        let displayCode;
        let nameLocal;
        let subtitleHTML;
        let customPillHTML = '';

        if (isCustom) {
            displayCode = customItem.baseCode || customItem.code || 'CUSTOM';
            dbItem = { f: customItem.flag || '🏷️' };
            nameLocal = getCurrencyName(code);

            const baseSymbol = typeof getCurrencySymbol === 'function' 
                ? getCurrencySymbol(displayCode) 
                : displayCode;
            const targetSymbol = typeof getCurrencySymbol === 'function' 
                ? getCurrencySymbol(customItem.rateCurrency || 'USD') 
                : (customItem.rateCurrency || 'USD');
            const formattedRate = typeof formatNumberString === 'function' 
                ? formatNumberString(String(customItem.rateValue)) 
                : String(customItem.rateValue);
            
            const pillPrefix = customItem.rateDirection === 'reverse'
                ? `1 ${targetSymbol} = `
                : `1 ${baseSymbol} = `;
            const pillVal = customItem.rateDirection === 'reverse'
                ? `${formattedRate} ${baseSymbol}`
                : `${formattedRate} ${targetSymbol}`;
            const ratePillText = `${pillPrefix}${pillVal}`;

            const pillTooltip = `${t.customTag || 'Custom'}: ${ratePillText} (${state.lang === 'ru' ? 'нажмите для выбора варианта или редактирования' : 'tap to select variant or edit'})`;

            if (customItem.note) {
                subtitleHTML = `<span class="c-name"><span class="custom-card-note">${escapeHTML(customItem.note)}</span><span class="custom-card-subname"> • ${escapeHTML(nameLocal)}</span></span>`;
            } else {
                subtitleHTML = `<span class="c-name">${escapeHTML(nameLocal)}</span>`;
            }

            customPillHTML = `
                <button type="button" class="custom-rate-pill" data-variant-root="${rootCode}" data-edit-id="${code}" title="${escapeHTML(pillTooltip)}" aria-label="${escapeHTML(t.switchVariant || 'Switch rate variant')}">
                    <span class="custom-rate-pill-prefix">${escapeHTML(pillPrefix)}</span><span class="custom-rate-pill-val">${escapeHTML(pillVal)}</span>
                    <span class="custom-rate-pill-arrow">▾</span>
                </button>
            `;
        } else {
            displayCode = code;
            dbItem = (typeof currencyDb !== 'undefined' && currencyDb[code]) ? currencyDb[code] : { f: "🏳️" };
            nameLocal = getCurrencyName(code);
            subtitleHTML = `<span class="c-name">${escapeHTML(nameLocal)}</span>`;

            if (hasMultipleVariants) {
                const marketLabel = t.marketTag || (state.lang === 'ru' ? 'Биржевой' : 'Market');
                const pillTooltip = `${t.marketRateTitle || 'Market'} (${state.lang === 'ru' ? 'нажмите для выбора своего курса' : 'tap to switch to custom rate'})`;
                customPillHTML = `
                    <button type="button" class="custom-rate-pill market-pill" data-variant-root="${rootCode}" title="${escapeHTML(pillTooltip)}" aria-label="${escapeHTML(t.switchVariant || 'Switch rate variant')}">
                        <span class="custom-rate-pill-val">${escapeHTML(marketLabel)}</span>
                        <span class="custom-rate-pill-arrow">▾</span>
                    </button>
                `;
            }
        }

        const card = document.createElement('div');
        card.className = 'currency-card';
        
        const hasRate = !!state.rates[code];
        const placeholderText = hasRate ? '0' : (t.noRate || (state.lang === 'ru' ? 'Нет курса' : 'No rate'));

        card.innerHTML = `
            <div class="currency-meta">
                <span class="flag">${dbItem.f}</span>
                <div class="code-name">
                    <div class="c-code-row">
                        <span class="c-code">${displayCode}</span>
                        ${customPillHTML}
                    </div>
                    ${subtitleHTML}
                </div>
            </div>
            <div class="right-block">
                <input type="text" ${isTouchDevice() ? 'inputmode="none"' : 'inputmode="decimal"'} class="currency-input" id="input-${code}" placeholder="${placeholderText}" data-code="${code}" autocomplete="off" ${!hasRate ? 'disabled' : ''}>
                <div class="card-action-btns">
                    <button type="button" class="share-btn" id="share-${code}" title="${escapeHTML(t.shareBreakdown || 'Share Breakdown')}" aria-label="${escapeHTML(t.shareBreakdown || 'Share conversion')}">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                            <polyline points="16 6 12 2 8 6"></polyline>
                            <line x1="12" y1="2" x2="12" y2="15"></line>
                        </svg>
                    </button>
                    <button type="button" class="clear-btn" id="clear-${code}" title="${escapeHTML(t.clear || 'Clear')}">×</button>
                </div>
            </div>
        `;
        fragment.appendChild(card);

        const customPill = card.querySelector('.custom-rate-pill');
        if (customPill) {
            customPill.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
            });
            customPill.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (typeof triggerHaptic === 'function') triggerHaptic(10);
                const variantRoot = customPill.dataset.variantRoot;
                if (variantRoot && typeof openVariantSelectorModal === 'function') {
                    openVariantSelectorModal(variantRoot);
                } else if (typeof openCustomRateModal === 'function') {
                    const editId = customPill.dataset.editId || code;
                    openCustomRateModal({ editId });
                }
            });
        }

        const clearBtn = card.querySelector('.clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
            });
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearAllInputs(e);
            });
        }
        const cardShareBtn = card.querySelector('.share-btn');
        if (cardShareBtn) {
            cardShareBtn.addEventListener('click', (e) => {
                if (typeof shareBreakdown === 'function') {
                    shareBreakdown(code, e);
                }
            });
        }

        card.addEventListener('click', (e) => {
            if (e.target.closest('.clear-btn') || e.target.closest('.share-btn') || e.target.closest('.currency-input') || e.target.closest('.custom-rate-pill') || e.target.closest('.flag')) return;
            const input = card.querySelector('.currency-input');
            if (!input || input.disabled) return;

            const code = input.dataset.code;
            const isFirst = !isCurrencyActive(code, input);

            if (isTouchDevice()) {
                openVirtualKeypad(input);
            } else {
                input.focus({ preventScroll: true });
            }

            if (isFirst) {
                currentEditingCode = code;
                requestAnimationFrame(() => {
                    const len = input.value.length;
                    input.setSelectionRange(len, len);
                });
            }
        });
    });

    container.innerHTML = '';
    container.appendChild(fragment);

    document.querySelectorAll('.currency-input').forEach(input => {
        // Track pointerdown to determine if this is first tap on this currency
        input.addEventListener('pointerdown', () => {
            const code = input.dataset.code;
            const isFirst = !isCurrencyActive(code, input);
            input.dataset.isFirstTap = isFirst ? 'true' : 'false';
        });

        // Show virtual keypad on focus or click (touch only)
        input.addEventListener('focus', (e) => {
            const inputEl = e.target;
            const code = inputEl.dataset.code;
            const parentCard = inputEl.closest('.currency-card');

            document.querySelectorAll('.currency-card').forEach(c => c.classList.remove('active-input-card'));
            if (parentCard) parentCard.classList.add('active-input-card');
            activeInputEl = inputEl;
            currentInputCode = code;

            const isFirst = inputEl.dataset.isFirstTap === 'true' || currentEditingCode !== code;

            if (isTouchDevice()) {
                openVirtualKeypad(inputEl);
            }

            if (isFirst) {
                currentEditingCode = code;
                requestAnimationFrame(() => {
                    const len = inputEl.value.length;
                    inputEl.setSelectionRange(len, len);
                });
            }
        });

        input.addEventListener('click', (e) => {
            const inputEl = e.target;
            const code = inputEl.dataset.code;
            const isFirst = inputEl.dataset.isFirstTap === 'true';

            if (isTouchDevice()) {
                openVirtualKeypad(inputEl);
            }

            if (isFirst) {
                currentEditingCode = code;
                inputEl.dataset.isFirstTap = 'false';
                requestAnimationFrame(() => {
                    const len = inputEl.value.length;
                    inputEl.setSelectionRange(len, len);
                });
            }
        });

        // 1. User input handler
        input.addEventListener('input', (e) => {
            const inputEl = e.target;
            const selStart = inputEl.selectionStart ?? inputEl.value.length;
            const nonSpacesBefore = countNonSpaces(inputEl.value.slice(0, selStart));

            let raw = inputEl.value.replace(/,/g, '.').replace(/\s/g, '');
            let cleanVal = raw.replace(/[^0-9.\+\-\*\/\(\)]/g, ''); 
            
            let formatted = formatExpression(cleanVal);
            if (inputEl.value !== formatted) {
                inputEl.value = formatted;
                const newPos = findCursorPosByNonSpaceCount(formatted, nonSpacesBefore);
                inputEl.setSelectionRange(newPos, newPos);
            }
            
            adjustFontSize(inputEl);
            
            currentInputCode = inputEl.dataset.code;
            currentInputValue = cleanVal;
            
            const clearBtn = document.getElementById(`clear-${inputEl.dataset.code}`);
            if (clearBtn) {
                if (cleanVal !== '') clearBtn.classList.add('visible');
                else clearBtn.classList.remove('visible');
            }
            const shareBtn = document.getElementById(`share-${inputEl.dataset.code}`);
            if (shareBtn) {
                if (cleanVal !== '') shareBtn.classList.add('visible');
                else shareBtn.classList.remove('visible');
            }

            if (cleanVal.trim() === '') {
                currentInputValue = '';
                if (typeof debouncedSaveState === 'function') debouncedSaveState();
                else saveState();
                state.favorites.forEach(c => {
                    if (c !== inputEl.dataset.code) {
                        const otherInput = document.getElementById(`input-${c}`);
                        const otherClear = document.getElementById(`clear-${c}`);
                        const otherShare = document.getElementById(`share-${c}`);
                        if (otherInput) { otherInput.value = ''; otherInput.style.fontSize = '1.4rem'; }
                        if (otherClear) otherClear.classList.remove('visible');
                        if (otherShare) otherShare.classList.remove('visible');
                    }
                });
                if (typeof checkInputEasterEggs === 'function') {
                    checkInputEasterEggs('', inputEl);
                }
                if (typeof resetActiveEasterEggs === 'function') {
                    resetActiveEasterEggs();
                }
            } else {
                if (typeof debouncedSaveState === 'function') debouncedSaveState();
                else saveState();
                recalculate(inputEl.dataset.code, cleanVal);
                if (typeof checkInputEasterEggs === 'function') {
                    checkInputEasterEggs(cleanVal, inputEl);
                }
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

        // 3. Blur event handler
        input.addEventListener('blur', (e) => {
            if (!isTouchDevice()) {
                const parentCard = e.target.closest('.currency-card');
                if (parentCard) parentCard.classList.remove('active-input-card');
                setTimeout(() => {
                    if (document.activeElement !== input) {
                        if (currentEditingCode === input.dataset.code) {
                            currentEditingCode = null;
                        }
                    }
                }, 100);
            }
            applyMathResult(e.target);
        });
    });

    // Restore active input and recalculate values if saved
    if (currentInputCode && currentInputValue && state.favorites.includes(currentInputCode)) {
        const activeInput = document.getElementById(`input-${currentInputCode}`);
        if (activeInput) {
            activeInput.value = formatExpression(currentInputValue);
            adjustFontSize(activeInput);
            const clearBtn = document.getElementById(`clear-${currentInputCode}`);
            if (clearBtn) clearBtn.classList.add('visible');
            const shareBtn = document.getElementById(`share-${currentInputCode}`);
            if (shareBtn) shareBtn.classList.add('visible');
        }
        recalculate(currentInputCode, currentInputValue);
    }
    
    updateLastUpdateUI();
}

/**
 * Attaches language picker and theme button event listeners.
 */
const PRIVACY_CONTENT = {
    ru: {
        modalTitle: "Буфер обмена и безопасность",
        modalDesc: "Зачем приложению доступ и как защищены ваши данные",
        footerBtn: "Приватность",
        actionBtn: "Понятно",
        cards: [
            {
                icon: "📋",
                title: "Зачем браузер запрашивает доступ?",
                desc: "При открытии или возвращении в приложение конвертер проверяет буфер обмена. Если там скопирована сумма (например, <b>120 $</b>, <b>49.99 EUR</b> или <b>964 889 982 UZS</b>), вверху появляется плашка с предложением сконвертировать её в 1 клик."
            },
            {
                icon: "🔒",
                title: "100% локально на вашем устройстве",
                desc: "Конвертер работает по модели <b>Local-First (PWA)</b>. Текст из буфера анализируется исключительно в памяти вашего браузера. Данные <b>никогда не передаются на серверы</b>, в облако или третьим лицам."
            },
            {
                icon: "🛡️",
                title: "Только числа и валюты",
                desc: "Алгоритм ищет только финансовые суммы и обозначения валют. Все остальные данные (личная переписка, пароли, ссылки) мгновенно отбрасываются и нигде не сохраняются."
            },
            {
                icon: "⚡",
                title: "Контроль всегда в ваших руках",
                desc: "Приложение никогда не меняет поля ввода без вашего согласия. Расчёт выполнится только тогда, когда вы сами нажмёте кнопку <b>«Вставить»</b>."
            },
            {
                icon: "💡",
                title: "Почему браузер показывает системный запрос?",
                desc: "Запрос «Разрешить сайту доступ к буферу обмена» — это встроенная защита браузера (Chrome, Safari, Edge), чтобы ни один сайт не читал буфер незаметно. Вы в любой момент можете разрешить или запретить доступ в настройках браузера."
            }
        ]
    },
    en: {
        modalTitle: "Clipboard & Privacy",
        modalDesc: "Why access is requested and how your data is protected",
        footerBtn: "Privacy",
        actionBtn: "Got it",
        cards: [
            {
                icon: "📋",
                title: "Why does the browser ask for permission?",
                desc: "When opening or returning to the converter, it checks your clipboard. If a monetary amount is detected (e.g. <b>$120</b>, <b>49.99 EUR</b>, or <b>10,000 ₸</b>), a top banner offers instant 1-click conversion."
            },
            {
                icon: "🔒",
                title: "100% Local on Your Device",
                desc: "The app operates as a <b>Local-First PWA</b>. Clipboard contents are parsed strictly inside your browser memory and are <b>never sent to any server</b>, cloud, or third party."
            },
            {
                icon: "🛡️",
                title: "Strict Currency Filtering",
                desc: "The parser searches exclusively for numerical amounts and currency symbols. All other content (personal messages, passwords, URLs) is discarded immediately and never stored."
            },
            {
                icon: "⚡",
                title: "You Are in Full Control",
                desc: "The app never overwrites your current values automatically. Conversion occurs only when you explicitly tap the <b>\"Paste\"</b> button."
            },
            {
                icon: "💡",
                title: "Browser Security Prompt",
                desc: "The permission dialog is a standard browser security feature (Chrome, Safari, Edge) ensuring full transparency. You can grant or revoke this permission at any time in your browser settings."
            }
        ]
    }
};

function renderPrivacyContent() {
    const lang = (state && state.lang && PRIVACY_CONTENT[state.lang]) ? state.lang : 'en';
    const content = PRIVACY_CONTENT[lang] || PRIVACY_CONTENT['en'];

    const titleEl = document.getElementById('ui-privacy-modal-title');
    if (titleEl) titleEl.textContent = content.modalTitle;

    const descEl = document.getElementById('ui-privacy-modal-desc');
    if (descEl) descEl.textContent = content.modalDesc;

    const footerBtnTxt = document.getElementById('ui-footer-privacy-text');
    if (footerBtnTxt) footerBtnTxt.textContent = content.footerBtn;

    const actionBtn = document.getElementById('ui-privacy-action-btn');
    if (actionBtn) actionBtn.textContent = content.actionBtn;

    const listEl = document.getElementById('privacy-cards-list');
    if (listEl) {
        listEl.innerHTML = content.cards.map(card => `
            <div class="privacy-card-item">
                <span class="privacy-card-icon" aria-hidden="true">${card.icon}</span>
                <div class="privacy-card-content">
                    <div class="privacy-card-title">${card.title}</div>
                    <div class="privacy-card-desc">${card.desc}</div>
                </div>
            </div>
        `).join('');
    }
}

function openPrivacyModal() {
    triggerHaptic(10);
    const modal = document.getElementById('privacy-modal');
    if (!modal) return;

    renderPrivacyContent();
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
}

function closePrivacyModal() {
    triggerHaptic(8);
    const modal = document.getElementById('privacy-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
}

function setupUIEvents() {
    const langPicker = document.getElementById('lang-picker');
    if (langPicker) {
        langPicker.addEventListener('change', (e) => {
            state.lang = e.target.value;
            applyLocalization();
            renderMain();
            renderPrivacyContent();
            updatePWAManifest();
            saveState();
        });
    }

    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (typeof handleThemeBtnEasterEggClick === 'function' && handleThemeBtnEasterEggClick(themeBtn)) {
                return;
            }
            triggerHaptic(10);
            if (state.theme === 'gold') {
                state.theme = 'dark';
            } else {
                state.theme = state.theme === 'dark' ? 'light' : 'dark';
            }
            applyTheme();
            updatePWAManifest();
            saveState();
        });
    }

    // Privacy & Clipboard modal listeners
    const footerPrivacyBtn = document.getElementById('ui-footer-privacy-btn');
    if (footerPrivacyBtn) {
        footerPrivacyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openPrivacyModal();
        });
    }

    const smartPasteInfoBtn = document.getElementById('smart-paste-info');
    if (smartPasteInfoBtn) {
        smartPasteInfoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof smartPasteDismissTimeout !== 'undefined' && smartPasteDismissTimeout) {
                clearTimeout(smartPasteDismissTimeout);
                smartPasteDismissTimeout = null;
            }
            openPrivacyModal();
        });
    }

    const privacyCloseBtn = document.getElementById('ui-privacy-close-btn');
    if (privacyCloseBtn) {
        privacyCloseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closePrivacyModal();
        });
    }

    const privacyActionBtn = document.getElementById('ui-privacy-action-btn');
    if (privacyActionBtn) {
        privacyActionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closePrivacyModal();
        });
    }

    // Responsive font recalculation on window resize / orientation change
    window.addEventListener('resize', () => {
        document.querySelectorAll('.currency-input').forEach(input => {
            if (typeof adjustFontSize === 'function') {
                adjustFontSize(input);
            }
        });
    });
}
