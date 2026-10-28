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

function getElementDocumentTop(el) {
    let top = 0;
    while (el) {
        top += el.offsetTop || 0;
        el = el.offsetParent;
    }
    return top;
}

function updateListPositionForCard(card, keypad) {
    const favList = document.getElementById('favorites-container');
    if (!favList) return;

    if (!card) {
        favList.style.transform = '';
        return;
    }

    const headerEl = document.querySelector('header');
    const headerHeight = headerEl ? headerEl.offsetHeight : 55;
    const safeTop = headerHeight + 10;

    const keypadEl = keypad || document.getElementById('virtual-keypad');
    const keypadHeight = (keypadEl && keypadEl.offsetHeight > 0) ? keypadEl.offsetHeight : 340;
    const safeBottom = window.innerHeight - keypadHeight - 16;

    // Use invariant DOM layout positions (offsetTop) that never drift or accumulate errors
    const cardTop = getElementDocumentTop(card);
    const cardBottom = cardTop + card.offsetHeight;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    const naturalCardTop = cardTop - scrollY;
    const naturalCardBottom = cardBottom - scrollY;

    // Check if card is already comfortably inside the visible area between sticky header and keypad
    if (naturalCardTop >= safeTop && naturalCardBottom <= safeBottom) {
        favList.style.transform = '';
        return;
    }

    if (naturalCardBottom > safeBottom) {
        // Card is too low and would be overlapped by keypad: shift UP
        let shift = naturalCardBottom - safeBottom;

        // Strictly guarantee the active card never rises past safeTop (below the sticky header)
        const maxShift = Math.max(0, naturalCardTop - safeTop);
        shift = Math.min(shift, maxShift);

        favList.style.transform = shift > 0 ? `translateY(-${Math.round(shift)}px)` : '';
    } else if (naturalCardTop < safeTop) {
        // Card is scrolled above header: shift DOWN
        let shift = safeTop - naturalCardTop;
        favList.style.transform = shift > 0 ? `translateY(${Math.round(shift)}px)` : '';
    } else {
        favList.style.transform = '';
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

            keypad.classList.remove('is-closing');
            keypad.removeAttribute('hidden');

            if (!alreadyVisible) {
                requestAnimationFrame(() => {
                    keypad.classList.add('is-visible');
                    document.body.classList.add('has-keypad-open');

                    if (parentCard) {
                        updateListPositionForCard(parentCard, keypad);
                    }
                });
            } else {
                if (parentCard) {
                    updateListPositionForCard(parentCard, keypad);
                }
            }
        } else {
            input.setAttribute('inputmode', 'decimal');
            keypad.classList.remove('is-visible');
            keypad.setAttribute('hidden', '');
            updateListPositionForCard(null);
            document.body.classList.remove('has-keypad-open');
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
    
    // Smoothly slide currency cards back to natural position
    updateListPositionForCard(null);
    
    if (keypad && !keypad.hasAttribute('hidden')) {
        // Trigger smooth slide-down animation
        keypad.classList.remove('is-visible');
        keypad.classList.add('is-closing');

        clearTimeout(keypadCloseTimeout);
        keypadCloseTimeout = setTimeout(() => {
            keypad.setAttribute('hidden', '');
            keypad.classList.remove('is-closing');
            document.body.classList.remove('has-keypad-open');
            isClosingKeypad = false;
        }, 380);
    } else {
        document.body.classList.remove('has-keypad-open');
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

    window.addEventListener('resize', () => {
        if (document.body.classList.contains('has-keypad-open') && activeInputEl) {
            const parentCard = activeInputEl.closest('.currency-card');
            const keypad = document.getElementById('virtual-keypad');
            updateListPositionForCard(parentCard, keypad);
        }
    });
}
