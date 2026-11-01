// ============================================================
// EXCHANGE RATES FETCHING & NETWORK STATUS
// Multi-provider rate fetching, CoinGecko crypto sync, and TTL caching.
// ============================================================

// Priority API endpoints for fiat currency rates (no keys required)
const FIAT_API_URLS = [
    "https://api.exchangerate.fun/latest?base=USD",
    "https://api.frankfurter.app/latest?from=USD",
    "https://open.er-api.com/v6/latest/USD"
];

// Rate caching interval: 1 hour (3 600 000 ms)
const RATES_CACHE_TTL = 60 * 60 * 1000;

// Anti-DDoS throttle interval between manual/forced rate requests (5 seconds)
const MIN_FORCE_REFRESH_INTERVAL = 5 * 1000;

let isUpdatingRates = false;

/**
 * Active network status check (pings endpoint to confirm real connectivity).
 */
async function checkRealOnlineStatus() {
    if (!navigator.onLine) return false;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout

        await fetch(`https://1.1.1.1/cdn-cgi/trace?_=${Date.now()}`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Updates UI status badge (Online / Offline / Syncing).
 */
async function updateOnlineStatusUI(isSyncing = false) {
    const status = document.getElementById('sync-status');
    const loader = document.getElementById('loader');
    if (!status) return;

    const t = (typeof i18n !== 'undefined' && i18n[state.lang]) 
        ? i18n[state.lang] 
        : { sync: 'Syncing...', online: 'Online', offline: 'Offline' };

    if (isSyncing) {
        status.textContent = t.sync;
        if (loader) loader.style.display = 'inline-block';
        return;
    }

    if (loader) loader.style.display = 'none';

    const isOnline = await checkRealOnlineStatus();
    status.textContent = isOnline ? t.online : t.offline;
}

/**
 * Helper for network fetch with strict abort timeout.
 */
async function fetchWithTimeout(url, timeoutMs = 6000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return res;
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

/**
 * Fetches fiat exchange rates with automatic fallback across providers.
 */
async function fetchFiatRates() {
    let lastError = null;
    
    for (const url of FIAT_API_URLS) {
        try {
            const res = await fetchWithTimeout(url, 6000);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            
            if (data && data.rates && typeof data.rates === 'object' && Object.keys(data.rates).length > 0) {
                let rates = { ...data.rates };
                if (!rates['USD']) {
                    rates['USD'] = 1;
                }
                return rates;
            }
        } catch (e) {
            console.warn(`Не удалось загрузить данные из источника ${url}:`, e);
            lastError = e;
        }
    }
    throw lastError || new Error("All fiat currency rate sources are unavailable");
}

/**
 * Coordinates fetching of fiat + cryptocurrency exchange rates.
 * Respects 1-hour cache TTL and anti-spam throttles.
 */
async function updateRates(forceUpdate = false) {
    if (isUpdatingRates) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - (state.lastUpdatedTimestamp || 0);
    const hasExistingRates = state.rates && Object.keys(state.rates).length > 0;

    // Cache check: if not forced and cached rates are less than 1 hour old, use cache
    if (!forceUpdate && hasExistingRates && timeSinceLastUpdate < RATES_CACHE_TTL) {
        console.log(`Using cached exchange rates (${Math.round(timeSinceLastUpdate / 1000)}s ago)`);
        await updateOnlineStatusUI(false);
        return;
    }

    // Anti-spam guard for forced refresh (protect APIs if reloaded repeatedly within 5 seconds)
    if (forceUpdate && hasExistingRates && timeSinceLastUpdate < MIN_FORCE_REFRESH_INTERVAL) {
        console.log(`Forced refresh throttled (${Math.round(timeSinceLastUpdate / 1000)}s ago)`);
        await updateOnlineStatusUI(false);
        return;
    }

    isUpdatingRates = true;

    // Show syncing indicator
    await updateOnlineStatusUI(true);

    try {
        const fiatRates = await fetchFiatRates();
        const newRates = { ...state.rates, ...fiatRates };

        if (typeof currencyDb !== 'undefined') {
            const cryptoIds = Object.values(currencyDb).filter(item => item.id).map(item => item.id);
            if (cryptoIds.length > 0) {
                try {
                    const resCrypto = await fetchWithTimeout(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds.join(',')}&vs_currencies=usd`, 5000);
                    if (resCrypto.ok) {
                        const dataCrypto = await resCrypto.json();
                        Object.keys(currencyDb).forEach(code => {
                            const apiId = currencyDb[code].id;
                            if (apiId && dataCrypto && dataCrypto[apiId] && dataCrypto[apiId].usd) {
                                newRates[code] = 1 / dataCrypto[apiId].usd;
                            }
                        });
                    }
                } catch (cryptoErr) {
                    console.warn("Cryptocurrency rates update failed:", cryptoErr);
                }
            }
        }

        // ONLY update timestamp & rates when actual network fetch succeeds
        state.rates = newRates;
        recomputeCustomRates();
        state.lastUpdatedTimestamp = Date.now();
        state.lastUpdated = new Date().toLocaleString();
        
        saveState();
        updateLastUpdateUI();
    } catch (e) {
        console.error("Exchange rates update failed, preserving previous cache:", e);
        recomputeCustomRates();
        // Previous cache & timestamp remain intact
    } finally {
        isUpdatingRates = false;
        await updateOnlineStatusUI(false);

        // Re-render DOM only if input is not focused and virtual keypad is not active
        const activeEl = document.activeElement;
        const isInputFocused = activeEl && activeEl.classList.contains('currency-input');
        const isKeypadOpen = document.body.classList.contains('has-keypad-open') || activeInputEl !== null;

        if (!isInputFocused && !isKeypadOpen) {
            renderMain();
        } else if (currentInputCode && currentInputValue !== '') {
            recalculate(currentInputCode, currentInputValue);
        }
    }
}

/**
 * Dynamically computes rates for all custom currencies in state.customCurrencies
 * relative to the latest market exchange rates.
 */
function recomputeCustomRates() {
    if (!state || !state.customCurrencies || typeof state.customCurrencies !== 'object') {
        return;
    }
    if (!state.rates) state.rates = {};
    if (!state.rates['USD']) state.rates['USD'] = 1;

    Object.values(state.customCurrencies).forEach(custom => {
        if (!custom || !custom.id) return;
        const targetCurrency = custom.rateCurrency || 'USD';
        const targetRate = state.rates[targetCurrency] || 1;
        const val = parseFloat(custom.rateValue);
        if (isNaN(val) || val <= 0) return;

        if (custom.rateDirection === 'reverse') {
            // 1 targetCurrency = val customUnits
            state.rates[custom.id] = targetRate * val;
        } else {
            // 1 customUnit = val targetCurrency (direct)
            state.rates[custom.id] = targetRate / val;
        }
    });
}
