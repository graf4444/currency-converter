// ============================================================
// CONVERTER & RECALCULATION ENGINE
// Cross-currency conversion logic and input resets.
// ============================================================

/**
 * Recalculates all favorite currency cards based on active input value.
 * Supports evaluating math expressions (e.g. 50+20) in real-time.
 * 
 * @param {string} activeCode - The currency code currently being edited.
 * @param {string} rawValue - Raw user input string.
 */
function recalculate(activeCode, rawValue) {
    if (!state.rates[activeCode]) return;

    let parsedVal = evaluateMathExpression(rawValue);
    
    if (parsedVal === null) {
        const cleanValue = parseCleanNumber(rawValue);
        parsedVal = parseFloat(cleanValue);
    }

    if (isNaN(parsedVal) || rawValue.trim() === '') {
        state.favorites.forEach(code => {
            if (code !== activeCode) {
                const input = document.getElementById(`input-${code}`);
                const clearBtn = document.getElementById(`clear-${code}`);
                const shareBtn = document.getElementById(`share-${code}`);
                if (input) input.value = '';
                if (clearBtn) clearBtn.classList.remove('visible');
                if (shareBtn) shareBtn.classList.remove('visible');
            }
        });
        return;
    }
    
    const valueInUSD = parsedVal / state.rates[activeCode];

    state.favorites.forEach(code => {
        if (code !== activeCode) {
            const input = document.getElementById(`input-${code}`);
            const clearBtn = document.getElementById(`clear-${code}`);
            if (input) {
                if (!state.rates[code]) {
                    input.value = state.lang === 'ru' ? 'Нет курса' : 'No rate';
                    input.style.fontSize = '1rem';
                    return;
                }

                const result = valueInUSD * state.rates[code];
                input.value = parsedVal === 0 ? '' : formatConvertedValue(result, code);
                
                adjustFontSize(input);
                
                if (clearBtn) {
                    if (input.value !== '') clearBtn.classList.add('visible');
                    else clearBtn.classList.remove('visible');
                }
                const shareBtn = document.getElementById(`share-${code}`);
                if (shareBtn) {
                    if (input.value !== '') shareBtn.classList.add('visible');
                    else shareBtn.classList.remove('visible');
                }
            }
        }
    });
}

/**
 * Clears all inputs and resets active calculation state.
 */
function clearAllInputs(e) {
    if (e && (Date.now() - lastCloseKeypadTime < 420)) {
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
        return;
    }
    currentInputCode = null;
    currentInputValue = '';
    saveState();
    state.favorites.forEach(c => {
        const input = document.getElementById(`input-${c}`);
        const clearBtn = document.getElementById(`clear-${c}`);
        const shareBtn = document.getElementById(`share-${c}`);
        if (input) {
            input.value = '';
            input.style.fontSize = '1.4rem';
        }
        if (clearBtn) clearBtn.classList.remove('visible');
        if (shareBtn) shareBtn.classList.remove('visible');
    });
}
