// ============================================================
// TOUCH DETECTION & VIRTUAL KEYPAD CONTROLLER
// In-app calculator keypad, smooth slide animations, and touch positioning.
// ============================================================

function isCurrencyActive(code, input) {
    if (currentEditingCode !== code) return false;
    if (isTouchDevice()) {
        return document.body.classList.contains('has-keypad-open');
    }
    return document.activeElement === input;
}

function scrollCardAboveKeypad(card, keypad) {
    if (!card) return;
    const cardRect = card.getBoundingClientRect();
    const keypadHeight = keypad ? keypad.offsetHeight : 340;
    const visibleHeight = window.innerHeight - keypadHeight;
    const safeBottom = visibleHeight - 12;

    if (cardRect.bottom > safeBottom || cardRect.top < 12) {
        const desiredTop = Math.max(12, (visibleHeight - cardRect.height) / 2);
        const targetY = window.scrollY + (cardRect.top - desiredTop);
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }
}

function openVirtualKeypad(input) {
    if (!input || input.disabled || isClosingKeypad || (Date.now() - lastCloseKeypadTime < 420)) return;
    
    activeInputEl = input;
    currentInputCode = input.dataset.code;
    const code = currentInputCode;
    const keypad = document.getElementById('virtual-keypad');
    const titleEl = document.getElementById('keypad-active-code');
    
    if (keypad) {
        if (titleEl) {
            const name = getCurrencyName(code);
            titleEl.textContent = `${code} - ${name}`;
        }
        
        // Highlight active card
        document.querySelectorAll('.currency-card').forEach(card => card.classList.remove('active-input-card'));
        const parentCard = input.closest('.currency-card');
        if (parentCard) parentCard.classList.add('active-input-card');
        
        if (useCustomKeypad) {
            if (isTouchDevice()) {
                input.setAttribute('inputmode', 'none');
            }
            
            const alreadyVisible = !keypad.hasAttribute('hidden') && keypad.classList.contains('is-visible');

            if (!alreadyVisible && savedScrollY === null) {
                savedScrollY = window.scrollY;
            }

            keypad.classList.remove('is-closing');
            keypad.removeAttribute('hidden');

            if (!alreadyVisible) {
                requestAnimationFrame(() => {
                    keypad.classList.add('is-visible');
                    document.body.classList.add('has-keypad-open');

                    if (parentCard) {
                        scrollCardAboveKeypad(parentCard, keypad);
                    }
                });
            } else {
                if (parentCard) {
                    scrollCardAboveKeypad(parentCard, keypad);
                }
            }
        } else {
            input.setAttribute('inputmode', 'decimal');
            keypad.classList.remove('is-visible');
            keypad.setAttribute('hidden', '');
            document.body.classList.remove('has-keypad-open');
            savedScrollY = null;
        }
    }
}

function closeVirtualKeypad() {
    if (isClosingKeypad) return;
    isClosingKeypad = true;
    currentEditingCode = null;
    lastCloseKeypadTime = Date.now();
    triggerHaptic(8);
    
    const keypad = document.getElementById('virtual-keypad');
    document.querySelectorAll('.currency-card').forEach(card => card.classList.remove('active-input-card'));
    
    if (savedScrollY !== null) {
        const targetY = savedScrollY;
        savedScrollY = null;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
    
    if (keypad && !keypad.hasAttribute('hidden')) {
        // Trigger smooth slide-down animation
        keypad.classList.remove('is-visible');
        keypad.classList.add('is-closing');
        
        // Smoothly reduce container padding in sync
        document.body.classList.remove('has-keypad-open');

        clearTimeout(keypadCloseTimeout);
        keypadCloseTimeout = setTimeout(() => {
            keypad.setAttribute('hidden', '');
            keypad.classList.remove('is-closing');
            isClosingKeypad = false;
        }, 400);
    } else {
        isClosingKeypad = false;
    }

    if (activeInputEl) {
        try { activeInputEl.blur(); } catch (_) {}
    }
    activeInputEl = null;
}

function handleKeypadPress(key) {
    let input = activeInputEl;
    if (!input && currentInputCode) {
        input = document.getElementById(`input-${currentInputCode}`);
    }
    if (!input) return;
    activeInputEl = input;
    
    triggerHaptic(key === '=' || key === 'C' ? 16 : 10);

    if (key === 'C') {
        input.value = '';
        currentInputValue = '';
        input.setSelectionRange(0, 0);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return;
    }
    
    if (key === '=') {
        applyMathResult(input);
        closeVirtualKeypad();
        return;
    }

    const { start, end, val } = getCursorSelection(input);

    if (key === 'BACKSPACE') {
        if (val.length === 0) return;
        
        let newRaw = '';
        let targetNonSpaces = 0;
        
        if (start !== end) {
            const before = val.slice(0, start);
            const after = val.slice(end);
            targetNonSpaces = countNonSpaces(before);
            newRaw = before + after;
        } else {
            if (start === 0) return;
            
            let deleteFrom = start - 1;
            while (deleteFrom > 0 && /\s/.test(val[deleteFrom])) {
                deleteFrom--;
            }
            const before = val.slice(0, deleteFrom);
            const after = val.slice(start);
            targetNonSpaces = countNonSpaces(before);
            newRaw = before + after;
        }

        let cleanVal = newRaw.replace(/,/g, '.').replace(/\s/g, '').replace(/[^0-9.\+\-\*\/\(\)]/g, '');
        let formatted = formatExpression(cleanVal);
        input.value = formatted;
        currentInputValue = cleanVal;
        
        const newCursorPos = findCursorPosByNonSpaceCount(formatted, targetNonSpaces);
        input.setSelectionRange(newCursorPos, newCursorPos);
        
        input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        const before = val.slice(0, start);
        const after = val.slice(end);
        const targetNonSpaces = countNonSpaces(before) + 1;
        const newRaw = before + key + after;

        let cleanVal = newRaw.replace(/,/g, '.').replace(/\s/g, '').replace(/[^0-9.\+\-\*\/\(\)]/g, '');
        let formatted = formatExpression(cleanVal);
        input.value = formatted;
        currentInputValue = cleanVal;

        const newCursorPos = findCursorPosByNonSpaceCount(formatted, targetNonSpaces);
        input.setSelectionRange(newCursorPos, newCursorPos);

        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

/**
 * Attaches event listeners for keypad buttons, close controls, and outside clicks.
 */
function setupKeypadEvents() {
    document.querySelectorAll('.key-btn').forEach(btn => {
        const handlePress = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const key = btn.dataset.key;
            handleKeypadPress(key);
        };

        btn.addEventListener('pointerdown', handlePress);
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    const keypadCloseBtn = document.getElementById('keypad-close');
    if (keypadCloseBtn) {
        const handleClose = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            closeVirtualKeypad();
        };
        keypadCloseBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
        });
        keypadCloseBtn.addEventListener('click', handleClose);
    }

    const keypadHideBtn = document.getElementById('keypad-hide-btn');
    if (keypadHideBtn) {
        const handleHide = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            closeVirtualKeypad();
        };
        keypadHideBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
        });
        keypadHideBtn.addEventListener('click', handleHide);
    }

    // Close keypad when clicking outside input fields, cards, or keypad
    document.addEventListener('pointerdown', (e) => {
        const target = e.target;
        if (
            !target.closest('#virtual-keypad') &&
            !target.closest('.currency-card') &&
            !target.closest('#search-modal') &&
            !target.closest('header')
        ) {
            if (document.body.classList.contains('has-keypad-open') && !isClosingKeypad) {
                closeVirtualKeypad();
            } else if (!isTouchDevice()) {
                currentEditingCode = null;
            }
        }
    });
}
