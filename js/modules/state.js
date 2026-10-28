// ============================================================
// CONFIGURATION & APPLICATION STATE
// Central state management and persistent settings.
// ============================================================

let state = {
    theme: 'dark', 
    lang: 'en',
    rates: {}, 
    favorites: ['USD', 'EUR', 'RUB', 'UZS', 'BTC'],
    lastUpdated: '',
    lastUpdatedTimestamp: 0,
    lastInputCode: null,
    lastInputValue: ''
};

// Active user input state storage
let currentInputCode = null;
let currentInputValue = '';
let activeInputEl = null;
let currentEditingCode = null;
let useCustomKeypad = true;
let lastCloseKeypadTime = 0;
let isClosingKeypad = false;
let keypadCloseTimeout = null;
let savedScrollY = null;

/**
 * Initializes application settings from localStorage, or detects
 * system language and color theme if no saved preferences exist.
 */
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
        if (state.lastInputCode && state.favorites.includes(state.lastInputCode) && typeof state.lastInputValue === 'string' && state.lastInputValue.trim() !== '') {
            currentInputCode = state.lastInputCode;
            currentInputValue = state.lastInputValue;
        } else {
            state.lastInputCode = null;
            state.lastInputValue = '';
            currentInputCode = null;
            currentInputValue = '';
        }
    } else {
        const sysLang = navigator.language || navigator.userLanguage || 'en';
        const shortLang = sysLang.split('-')[0].toLowerCase();

        state.lang = (typeof i18n !== 'undefined' && i18n[shortLang]) ? shortLang : 'en';
        state.theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
        saveState();
    }
}

/**
 * Persists active state to localStorage (sanitizing favorites list).
 */
function saveState() { 
    state.favorites = [...new Set(state.favorites.filter(c => typeof c === 'string' && c.trim() !== ''))];
    state.lastInputCode = currentInputCode;
    state.lastInputValue = currentInputValue;
    localStorage.setItem('conv_max_state', JSON.stringify(state)); 
}
