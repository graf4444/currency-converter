// ============================================================
// UI RENDERING, THEME & LOCALIZATION CONTROLLER
// Main currency cards renderer, dynamic inputs, themes, and translations.
// ============================================================

function getCurrencyName(code) {
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

    const btnAdd = document.getElementById('ui-add-btn');
    if (btnAdd) btnAdd.textContent = t.add;
    
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
        themeBtn.textContent = state.theme === 'dark' ? '☀️' : '🌙';
        themeBtn.setAttribute('title', state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
        themeBtn.setAttribute('aria-label', state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
}

function updatePWAManifest() {
    const lang = (state && state.lang && typeof i18n !== 'undefined' && i18n[state.lang]) ? state.lang : 'en';
    const themeColor = state.theme === 'dark' ? '#1c1c1e' : '#f2f2f7';

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
 * Main DOM renderer for currency converter cards.
 */
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
        const trendBadgeHTML = '';

        card.innerHTML = `
            <div class="currency-meta">
                <span class="flag">${dbItem.f}</span>
                <div class="code-name">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="c-code">${code}</span>
                        ${trendBadgeHTML}
                    </div>
                    <span class="c-name">${nameLocal}</span>
                </div>
            </div>
            <div class="right-block">
                <input type="text" ${isTouchDevice() ? 'inputmode="none"' : 'inputmode="decimal"'} class="currency-input" id="input-${code}" placeholder="${placeholderText}" data-code="${code}" autocomplete="off" ${!hasRate ? 'disabled' : ''}>
                <div class="card-action-btns">
                    <button type="button" class="share-btn" id="share-${code}" title="Share Breakdown" aria-label="Share conversion">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                            <polyline points="16 6 12 2 8 6"></polyline>
                            <line x1="12" y1="2" x2="12" y2="15"></line>
                        </svg>
                    </button>
                    <button type="button" class="clear-btn" id="clear-${code}" title="Clear">×</button>
                </div>
            </div>
        `;
        fragment.appendChild(card);
        card.querySelector('.clear-btn').addEventListener('click', clearAllInputs);
        const cardShareBtn = card.querySelector('.share-btn');
        if (cardShareBtn) {
            cardShareBtn.addEventListener('click', (e) => {
                if (typeof shareBreakdown === 'function') {
                    shareBreakdown(code, e);
                }
            });
        }

        card.addEventListener('click', (e) => {
            if (e.target.closest('.clear-btn') || e.target.closest('.share-btn') || e.target.closest('.currency-input')) return;
            const input = card.querySelector('.currency-input');
            if (!input || input.disabled) return;

            const code = input.dataset.code;
            const isFirst = !isCurrencyActive(code, input);

            if (isTouchDevice()) {
                if (isClosingKeypad || (Date.now() - lastCloseKeypadTime < 420)) return;
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
                if (!isClosingKeypad && (Date.now() - lastCloseKeypadTime >= 420)) openVirtualKeypad(inputEl);
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
                if (!isClosingKeypad && (Date.now() - lastCloseKeypadTime >= 420)) openVirtualKeypad(inputEl);
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
                currentInputCode = null;
                currentInputValue = '';
                saveState();
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
            } else {
                saveState();
                recalculate(inputEl.dataset.code, cleanVal);
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
            triggerHaptic(10);
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
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
}
