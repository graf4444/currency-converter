// ============================================================
// EASTER EGGS MODULE
// 1. «1337»   (Matrix retro terminal mode)
// 2. «777»    (Jackpot casino slot reels & gold coins confetti)
// 3. «/ 0»    (Divide-by-zero: Explosion blast physics & centered banner)
// 4. «80085»  (Giggling keypad & display)
// 5. «01134»  (Upside-down display & keypad for hELLO)
// 6. «Splash» (Splash screen mini-slot roulette on double/triple tap)
// 7. «Gold»   (Gold VIP Edition AMOLED Pitch Black on 7 theme taps)
// 8. «Shake»  (Accelerometer devicemotion cards physics collapse)
// 9. «Moon»   (Triple-click on ₿ symbol: Rocket To The Moon & confetti)
// ============================================================

// State guards
let isMatrixActive = false;
let matrixTimeout = null;
let isJackpotActive = false;
let isEconomyWarningActive = false;
let isGiggleActive = false;
let giggleTimeout = null;
let isUpsideDownActive = false;
let upsideDownTimeout = null;

// ============================================================
// LOCALIZATION HELPER (Reads from central i18n in constants.js)
// ============================================================

function getEasterEggText(key, fallback = '') {
    const lang = (typeof state !== 'undefined' && state && state.lang) ? state.lang : 'en';
    if (typeof i18n !== 'undefined' && i18n[lang] && i18n[lang][key]) {
        return i18n[lang][key];
    }
    if (typeof i18n !== 'undefined' && i18n.en && i18n.en[key]) {
        return i18n.en[key];
    }
    return fallback;
}

// Lifecycle guards:
// Once an easter egg triggers, it won't re-trigger while the field is non-empty.
// Only when the field is completely cleared to empty (''), it resets so easter eggs can trigger again.
let hasEasterEggFired = false;
let lastTriggeredEasterEgg = null;

let isPhysicsActive = false;
let physicsAnimId = null;
let isExplosionActive = false;
let explosionAnimId = null;
let explosionCards = [];
let physicsCards = [];
let easterEggAudioCtx = null;

/**
 * Smoothly hides the virtual keypad / native keyboard first before running an easter egg animation.
 * This prevents the keyboard from moving sideways, covering effects, or conflicting with transforms.
 */
function prepareForEasterEggAnimation(callback) {
    const keypad = document.getElementById('virtual-keypad');
    const isKeypadOpen = document.body.classList.contains('has-keypad-open') ||
        (keypad && !keypad.hasAttribute('hidden') && keypad.classList.contains('is-visible'));

    if (typeof closeVirtualKeypad === 'function') {
        closeVirtualKeypad();
    }
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        try { document.activeElement.blur(); } catch (_) {}
    }

    if (isKeypadOpen) {
        setTimeout(callback, 280);
    } else {
        callback();
    }
}

// ============================================================
// WEB AUDIO SYNTHESIZER (Soft, pleasant, non-intrusive)
// ============================================================

function getAudioContext() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        if (!easterEggAudioCtx) {
            easterEggAudioCtx = new AudioCtx();
        }
        if (easterEggAudioCtx.state === 'suspended') {
            easterEggAudioCtx.resume().catch(() => {});
        }
        return easterEggAudioCtx;
    } catch (_) {
        return null;
    }
}

function playTone(freq, type = 'sine', duration = 0.1, delay = 0, gainLevel = 0.022) {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        setTimeout(() => {
            try {
                const now = ctx.currentTime;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, now);
                const attack = Math.min(0.02, duration * 0.2);
                gain.gain.setValueAtTime(0.0001, now);
                gain.gain.linearRampToValueAtTime(gainLevel, now + attack);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + duration);
            } catch (_) {}
        }, delay);
    } catch (_) {}
}

function playMatrixSound() {
    playTone(587.33, 'sine', 0.06, 0, 0.02);
    playTone(880, 'sine', 0.06, 50, 0.02);
    playTone(1174.66, 'sine', 0.08, 100, 0.02);
}

function playJackpotSound() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
        playTone(freq, 'sine', 0.16, idx * 95, 0.022);
    });
    setTimeout(() => {
        playTone(1318.51, 'sine', 0.25, 0, 0.025);
        playTone(1567.98, 'sine', 0.35, 80, 0.025);
    }, 420);
}

function playReelTickSound() {
    playTone(660, 'sine', 0.03, 0, 0.015);
}

// Gentle, cartoonish muffled poof for / 0 and physics (soft, warm, non-startling)
function playExplosionSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // 1. Soft, warm low-frequency thump (muffled cartoon poof)
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.4);

        oscGain.gain.setValueAtTime(0.0001, now);
        oscGain.gain.linearRampToValueAtTime(0.032, now + 0.02);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);

        // 2. Very gentle low-pass muffled air puff (no sharp hiss or loud boom)
        const bufferSize = Math.floor(ctx.sampleRate * 0.35);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(160, now);
        filter.frequency.exponentialRampToValueAtTime(50, now + 0.35);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.0001, now);
        noiseGain.gain.linearRampToValueAtTime(0.02, now + 0.02);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.35);
    } catch (_) {}
}

// Gentle, soft chuckle sound for 80085
function playGiggleSound() {
    playTone(523.25, 'sine', 0.08, 0, 0.022);   // C5
    playTone(659.25, 'sine', 0.08, 70, 0.022);  // E5
    playTone(587.33, 'sine', 0.08, 140, 0.022); // D5
    playTone(783.99, 'sine', 0.10, 210, 0.022); // G5
}

// Welcoming soft two-note chime for 01134 (hELLO)
function playHelloChime() {
    playTone(523.25, 'sine', 0.22, 0, 0.025);
    playTone(659.25, 'sine', 0.3, 120, 0.025);
}

// Realistic soft banknotes rustling sound using warm filtered noise flutters
function playCashRustleSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const bufferSize = Math.floor(ctx.sampleRate * 0.45);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2200;
        filter.Q.value = 1.0;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);

        const flutters = [0.02, 0.09, 0.17, 0.25, 0.34];
        flutters.forEach((t) => {
            gain.gain.setValueAtTime(0.0001, now + t);
            gain.gain.linearRampToValueAtTime(0.022, now + t + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.06);
        });

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 0.42);
    } catch (_) {}
}

// Warm royal gold luxury chord (pure gentle sine tones)
function playGoldLuxuryChime() {
    playTone(739.99, 'sine', 0.32, 0, 0.022);   // F#5
    playTone(932.33, 'sine', 0.35, 90, 0.022);  // A#5
    playTone(1108.73, 'sine', 0.38, 180, 0.025); // C#6
    playTone(1479.98, 'sine', 0.5, 270, 0.025);  // F#6
}

// Soft ascending futuristic sweep for To The Moon (gentle sine wave)
function playRocketLaunchSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 1.8);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.025, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 2.0);
    } catch (_) {}
}

// ============================================================
// CANCEL & RESET ALL ACTIVE EASTER EGGS
// ============================================================

function resetActiveEasterEggs() {
    hasEasterEggFired = false;
    lastTriggeredEasterEgg = null;

    if (isGiggleActive) {
        clearTimeout(giggleTimeout);
        const keypad = document.getElementById('virtual-keypad');
        const container = document.getElementById('favorites-container');
        if (keypad) keypad.classList.remove('keypad-giggle-active');
        if (container) container.classList.remove('display-giggle-active');
        isGiggleActive = false;
    }

    if (isUpsideDownActive) {
        clearTimeout(upsideDownTimeout);
        const keypad = document.getElementById('virtual-keypad');
        const container = document.getElementById('favorites-container');
        if (keypad) keypad.classList.remove('keypad-upside-down');
        if (container) container.classList.remove('display-upside-down');
        isUpsideDownActive = false;
    }

    if (isMatrixActive) {
        exitMatrixMode();
    }

    if (isJackpotActive) {
        const banner = document.querySelector('.jackpot-banner');
        if (banner) {
            try { banner.remove(); } catch (_) {}
        }
        const canvas = document.getElementById('jackpot-confetti-canvas');
        if (canvas) {
            try { canvas.remove(); } catch (_) {}
        }
        document.querySelectorAll('.currency-input').forEach(input => {
            input.classList.remove('slot-spinning', 'slot-locked');
        });
        isJackpotActive = false;
    }

    if (isEconomyWarningActive) {
        const banner = document.querySelector('.economy-banner');
        if (banner) {
            try { banner.remove(); } catch (_) {}
        }
        isEconomyWarningActive = false;
    }

    if (isExplosionActive) {
        restoreExplosionCards();
    }

    if (isPhysicsActive) {
        restorePhysicsCards();
    }
}

// ============================================================
// EASTER EGG 1: «1337» (RETRO MATRIX TERMINAL MODE)
// ============================================================

function toLeetSpeak(text, isCode = false) {
    if (!text) return '';
    if (isCode) {
        const codeMap = {
            'USD': 'U$D', 'EUR': '3UR', 'RUB': 'RU8', 'GBP': '68P',
            'BTC': '87C', 'ETH': '37H', 'JPY': 'JP¥', 'CNY': 'CN¥',
            'CAD': 'C4D', 'AUD': '4UD', 'CHF': 'CH|=', 'KZT': 'KZ7',
            'UAH': 'U4H', 'BYN': '8YN', 'GEL': '63L', 'TRY': '7RY',
            'USDT': 'U$D7', 'SOL': '$0L', 'TON': '70N', 'DOGE': 'D063',
            'XRP': 'XR|>', 'BNB': '8N8'
        };
        const upper = text.toUpperCase();
        if (codeMap[upper]) return codeMap[upper];
    }

    return text
        .replace(/[AaАа]/g, '4')
        .replace(/[BbВвБб]/g, '8')
        .replace(/[EeЕеЭэ]/g, '3')
        .replace(/[GgГг]/g, '6')
        .replace(/[IiИи1]/g, '1')
        .replace(/[OoОо0]/g, '0')
        .replace(/[SsСс]/g, '$')
        .replace(/[TtТт]/g, '7')
        .replace(/[ZzЗз]/g, '2');
}

function enterMatrixMode() {
    if (isMatrixActive) return;
    isMatrixActive = true;

    triggerHaptic(30);
    playMatrixSound();

    document.body.classList.add('easter-egg-matrix');

    document.querySelectorAll('.c-code').forEach(el => {
        if (!el.dataset.matrixOriginal) el.dataset.matrixOriginal = el.textContent;
        el.textContent = toLeetSpeak(el.dataset.matrixOriginal, true);
    });

    document.querySelectorAll('.c-name, .custom-card-note, .custom-card-subname').forEach(el => {
        if (!el.dataset.matrixOriginal) el.dataset.matrixOriginal = el.textContent;
        el.textContent = toLeetSpeak(el.dataset.matrixOriginal, false);
    });

    const uiTitle = document.getElementById('ui-title');
    if (uiTitle) {
        if (!uiTitle.dataset.matrixOriginal) uiTitle.dataset.matrixOriginal = uiTitle.textContent;
        uiTitle.textContent = '> [1337_MODE] _';
    }

    const toastMsg = getEasterEggText('matrixModeToast', '> [1337] MATRIX MODE ACTIVATED // TAP TO EXIT');
    if (typeof showToast === 'function') {
        showToast(toastMsg);
    }

    clearTimeout(matrixTimeout);
    matrixTimeout = setTimeout(() => {
        exitMatrixMode();
    }, 7500);

    setTimeout(() => {
        if (isMatrixActive) {
            window.addEventListener('pointerdown', onMatrixTap, { capture: true, once: true });
        }
    }, 180);
}

function onMatrixTap() {
    if (!isMatrixActive) return;
    exitMatrixMode();
}

function exitMatrixMode() {
    if (!isMatrixActive) return;
    isMatrixActive = false;

    clearTimeout(matrixTimeout);
    window.removeEventListener('pointerdown', onMatrixTap, { capture: true });

    document.body.classList.remove('easter-egg-matrix');

    document.querySelectorAll('[data-matrix-original]').forEach(el => {
        el.textContent = el.dataset.matrixOriginal;
        delete el.dataset.matrixOriginal;
    });

    playMatrixSound();
    // Note: entered number remains in the input as requested!
}

// ============================================================
// DYNAMIC GOLD & BITCOIN CONFETTI SYSTEM
// ============================================================

function launchGoldConfetti(durationMs = 4500, coinChar = '$') {
    const canvas = document.createElement('canvas');
    canvas.id = 'jackpot-confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const goldColors = ['#FFD700', '#FFC700', '#FFA500', '#FFF176', '#D4AF37', '#FFE082'];
    const particleCount = 55;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: -20 - Math.random() * (height * 0.4),
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 4 + 3.2,
            radius: Math.random() * 6 + 7,
            pitch: Math.random() * Math.PI,
            pitchSpeed: Math.random() * 0.16 + 0.05,
            yaw: Math.random() * Math.PI,
            yawSpeed: Math.random() * 0.08 + 0.02,
            color: goldColors[Math.floor(Math.random() * goldColors.length)],
            isCoin: Math.random() > 0.35,
            opacity: 1
        });
    }

    const startTime = Date.now();
    let animId = null;

    function render() {
        const elapsed = Date.now() - startTime;
        ctx.clearRect(0, 0, width, height);
        let activeCount = 0;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.pitch += p.pitchSpeed;
            p.yaw += p.yawSpeed;
            p.vx += (Math.random() - 0.5) * 0.1;

            if (elapsed > durationMs - 1000) {
                p.opacity = Math.max(0, (durationMs - elapsed) / 1000);
            }

            if (p.y < height + 40 && p.opacity > 0) {
                activeCount++;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.yaw);
                ctx.globalAlpha = p.opacity;

                const scaleY = Math.abs(Math.cos(p.pitch));

                if (p.isCoin) {
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.radius, Math.max(1, p.radius * scaleY), 0, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.fill();

                    if (scaleY > 0.3) {
                        ctx.beginPath();
                        ctx.ellipse(0, 0, p.radius * 0.75, Math.max(1, p.radius * 0.75 * scaleY), 0, 0, Math.PI * 2);
                        ctx.strokeStyle = '#FFFFFF';
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        if (scaleY > 0.6) {
                            ctx.fillStyle = '#B8860B';
                            ctx.font = `bold ${Math.round(p.radius * 0.9)}px sans-serif`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(coinChar, 0, 0);
                        }
                    }
                } else {
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.radius * 0.5, Math.max(1, p.radius * 1.2 * scaleY), 0, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.fill();
                }

                ctx.restore();
            }
        }

        if (activeCount > 0 && elapsed < durationMs) {
            animId = requestAnimationFrame(render);
        } else {
            window.removeEventListener('resize', onResize);
            try { canvas.remove(); } catch (_) {}
        }
    }

    animId = requestAnimationFrame(render);
}

// ============================================================
// EASTER EGG 2: «777» (CASINO JACKPOT & GOLD COIN CONFETTI)
// ============================================================

function triggerJackpotEasterEgg() {
    if (isJackpotActive) return;
    isJackpotActive = true;

    triggerHaptic(40);
    playJackpotSound();
    launchGoldConfetti(4500, '$');

    const banner = document.createElement('div');
    banner.className = 'jackpot-banner';
    banner.innerHTML = 'JACKPOT! 🎰';
    document.body.appendChild(banner);
    setTimeout(() => {
        try { banner.remove(); } catch (_) {}
    }, 3200);

    const cards = Array.from(document.querySelectorAll('.currency-card'));
    if (!cards.length) {
        setTimeout(() => {
            isJackpotActive = false;
        }, 2800);
        return;
    }

    const reelData = cards.map((card, idx) => {
        const input = card.querySelector('.currency-input');
        if (!input) return null;
        return {
            input,
            code: input.dataset.code,
            targetValue: input.value,
            stopDelay: 850 + idx * 260
        };
    }).filter(Boolean);

    reelData.forEach(({ input }) => {
        input.classList.add('slot-spinning');
    });

    const spinSymbols = ['777', '7 7 7', '777.77', '888', '333', '999', '777'];
    const startTime = Date.now();

    const interval = setInterval(() => {
        if (!isJackpotActive) {
            clearInterval(interval);
            return;
        }
        const now = Date.now();
        let anySpinning = false;

        reelData.forEach(item => {
            if (now - startTime < item.stopDelay) {
                anySpinning = true;
                const randSym = spinSymbols[Math.floor(Math.random() * spinSymbols.length)];
                item.input.value = randSym;
                if (typeof adjustFontSize === 'function') adjustFontSize(item.input);
            }
        });

        if (!anySpinning) {
            clearInterval(interval);
        }
    }, 45);

    reelData.forEach(item => {
        setTimeout(() => {
            if (!isJackpotActive) return;
            item.input.classList.remove('slot-spinning');
            item.input.value = item.targetValue || '777';
            if (typeof adjustFontSize === 'function') adjustFontSize(item.input);
            item.input.classList.add('slot-locked');
            triggerHaptic(18);
            playReelTickSound();
            setTimeout(() => {
                item.input.classList.remove('slot-locked');
            }, 400);
        }, item.stopDelay);
    });

    const maxDelay = Math.max(...reelData.map(d => d.stopDelay), 2400);
    setTimeout(() => {
        isJackpotActive = false;
        // Note: entered number 777 remains in the input as requested!
    }, maxDelay + 600);
}

// ============================================================
// EASTER EGG 3: DIVISION BY ZERO (/ 0) — EXPLOSION BLAST PHYSICS
// ============================================================

function triggerDivideByZeroEasterEgg(input) {
    if (isEconomyWarningActive || isPhysicsActive) return;
    isEconomyWarningActive = true;

    prepareForEasterEggAnimation(() => {
        if (navigator.vibrate) {
            try { navigator.vibrate([40, 70, 40]); } catch (_) {}
        }
        playExplosionSound();

        // 1. Centered warning banner
        const banner = document.createElement('div');
        banner.className = 'economy-banner';
        const textMsg = getEasterEggText('economyDestroyed', 'You almost destroyed the global economy!');
        banner.innerHTML = `
            <span class="economy-banner-icon">💥</span>
            <div class="economy-banner-text">${textMsg}</div>
        `;
        document.body.appendChild(banner);

        // 2. Blast all blocks outward with unified physics & show reassemble button!
        startCardsPhysics('explosion');

        if (input) {
            input.value = '';
            if (typeof adjustFontSize === 'function') adjustFontSize(input);
            const clearBtn = document.getElementById(`clear-${input.dataset.code}`);
            if (clearBtn) clearBtn.classList.remove('visible');
            const shareBtn = document.getElementById(`share-${input.dataset.code}`);
            if (shareBtn) shareBtn.classList.remove('visible');
        }

        setTimeout(() => {
            try { banner.remove(); } catch (_) {}
            isEconomyWarningActive = false;
        }, 2800);
    });
}

function triggerExplosionPhysics() {
    startCardsPhysics('explosion');
}

function restoreExplosionCards() {
    restorePhysicsCards();
}

// ============================================================
// EASTER EGG 4: «80085» — ONLY GIGGLE (ХИХИКАТЬ)
// ============================================================

function triggerGiggleEasterEgg() {
    if (isGiggleActive) return;
    isGiggleActive = true;

    triggerHaptic(25);
    playGiggleSound();

    const keypad = document.getElementById('virtual-keypad');
    const container = document.getElementById('favorites-container');
    const isKeypadOpen = document.body.classList.contains('has-keypad-open');

    if (keypad && isKeypadOpen) {
        keypad.classList.add('keypad-giggle-active');
    }
    if (container) {
        container.classList.add('display-giggle-active');
    }

    if (typeof showToast === 'function') {
        showToast('(¬‿¬) 80085 (BOOBS)');
    }

    clearTimeout(giggleTimeout);
    giggleTimeout = setTimeout(() => {
        if (keypad) keypad.classList.remove('keypad-giggle-active');
        if (container) container.classList.remove('display-giggle-active');
        isGiggleActive = false;
        // Note: entered number 80085 remains in the input as requested!
    }, 1800);
}

// ============================================================
// EASTER EGG 5: «01134» / «1134» — FLIP UPSIDE DOWN (ПЕРЕВОРАЧИВАТЬ)
// ============================================================

function triggerUpsideDownEasterEgg() {
    if (isUpsideDownActive) return;
    isUpsideDownActive = true;

    triggerHaptic(30);
    playHelloChime();

    const keypad = document.getElementById('virtual-keypad');
    const container = document.getElementById('favorites-container');
    const isKeypadOpen = document.body.classList.contains('has-keypad-open');

    if (keypad && isKeypadOpen) {
        keypad.classList.add('keypad-upside-down');
    }
    if (container) {
        container.classList.add('display-upside-down');
    }

    if (typeof showToast === 'function') {
        showToast('( ﾟ◡ﾟ) 01134 (hELLO)');
    }

    clearTimeout(upsideDownTimeout);
    upsideDownTimeout = setTimeout(() => {
        if (keypad) keypad.classList.remove('keypad-upside-down');
        if (container) container.classList.remove('display-upside-down');
        isUpsideDownActive = false;
        // Note: entered number 01134 remains in the input as requested!
    }, 2600);
}

// ============================================================
// EASTER EGG 6: SPLASH SCREEN SLOT MINIGAME
// ============================================================

let splashTapCount = 0;
let splashTapResetTimer = null;

function setupSplashMinigame() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;
    const badge = splash.querySelector('.splash-badge') || splash.querySelector('.splash-badge-box');
    if (!badge) return;

    badge.classList.add('splash-badge-minigame');

    const handleTap = () => {
        splashTapCount++;
        clearTimeout(splashTapResetTimer);
        splashTapResetTimer = setTimeout(() => { splashTapCount = 0; }, 600);

        if (splashTapCount >= 2) {
            splashTapCount = 0;
            startSplashSlotMinigame(splash, badge);
        }
    };

    badge.addEventListener('click', handleTap);
    badge.addEventListener('pointerdown', () => {
        triggerHaptic(15);
    });
}

function startSplashSlotMinigame(splash, badge) {
    if (window.__splashMinigameActive) return;
    window.__splashMinigameActive = true;

    triggerHaptic(35);
    badge.classList.add('splash-badge-active-game');

    const windowEl = badge.querySelector('.splash-slot-window');
    const statusText = document.getElementById('splash-status-text');
    if (statusText) statusText.textContent = getEasterEggText('rouletteSpinning', '🎰 SPINNING... 🎰');

    if (windowEl) {
        windowEl.innerHTML = `
            <div class="splash-mini-reels">
                <div class="splash-mini-reel spinning" id="mini-reel-1">?</div>
                <div class="splash-mini-reel spinning" id="mini-reel-2">?</div>
                <div class="splash-mini-reel spinning" id="mini-reel-3">?</div>
            </div>
        `;
    }

    const isBitcoinWin = Math.random() >= 0.5;
    const targetSymbol = isBitcoinWin ? '₿' : '$';
    const rollSymbols = ['₿', '$', '€', '¥', '7', '★', '₽'];

    const reel1 = document.getElementById('mini-reel-1');
    const reel2 = document.getElementById('mini-reel-2');
    const reel3 = document.getElementById('mini-reel-3');

    const spinInterval = setInterval(() => {
        if (reel1 && reel1.classList.contains('spinning')) {
            reel1.textContent = rollSymbols[Math.floor(Math.random() * rollSymbols.length)];
        }
        if (reel2 && reel2.classList.contains('spinning')) {
            reel2.textContent = rollSymbols[Math.floor(Math.random() * rollSymbols.length)];
        }
        if (reel3 && reel3.classList.contains('spinning')) {
            reel3.textContent = rollSymbols[Math.floor(Math.random() * rollSymbols.length)];
        }
    }, 45);

    setTimeout(() => {
        if (reel1) {
            reel1.classList.remove('spinning');
            reel1.textContent = targetSymbol;
            playReelTickSound();
            triggerHaptic(20);
        }
    }, 750);

    setTimeout(() => {
        if (reel2) {
            reel2.classList.remove('spinning');
            reel2.textContent = targetSymbol;
            playReelTickSound();
            triggerHaptic(20);
        }
    }, 1150);

    setTimeout(() => {
        clearInterval(spinInterval);
        if (reel3) {
            reel3.classList.remove('spinning');
            reel3.textContent = targetSymbol;
            playReelTickSound();
            triggerHaptic(45);
        }

        if (isBitcoinWin) {
            if (statusText) statusText.textContent = '₿ ₿ ₿ BITCOIN JACKPOT! ₿ ₿ ₿';
            playJackpotSound();
            launchGoldConfetti(4500, '₿');
        } else {
            if (statusText) statusText.textContent = getEasterEggText('cashDrop', '$ $ $ CASH DROP! $ $ $');
            playCashRustleSound();
            launchGoldConfetti(4500, '$');
        }

        setTimeout(() => {
            if (typeof window.dismissSplashScreenNow === 'function') {
                window.dismissSplashScreenNow();
            }
        }, 3600);
    }, 1550);
}

// ============================================================
// EASTER EGG 7: «GOLD VIP EDITION» (7 TAPS ON THEME BUTTON)
// ============================================================

let themeTapCount = 0;
let themeTapResetTimer = null;
let goldThemeCooldownUntil = 0;

function handleThemeBtnEasterEggClick() {
    const now = Date.now();

    // If currently in Gold theme
    if (state.theme === 'gold') {
        // If within cooldown period: user is continuing rapid taps from the 7-tap streak
        if (now < goldThemeCooldownUntil) {
            // Keep extending cooldown while the user continues clicking (1.2s from each tap)
            // so frantic mashing never accidentally shuts down gold theme!
            goldThemeCooldownUntil = Math.max(goldThemeCooldownUntil, now + 1200);
            return true; // absorb click!
        }

        // Cooldown has elapsed: user stopped tapping, waited >1.2s, and now clicked intentionally to return to normal
        exitGoldVipTheme();
        return true;
    }

    // Normal theme: accumulate taps towards 7
    themeTapCount++;
    clearTimeout(themeTapResetTimer);
    themeTapResetTimer = setTimeout(() => {
        themeTapCount = 0;
    }, 1800);

    if (themeTapCount >= 7) {
        themeTapCount = 0;
        goldThemeCooldownUntil = Date.now() + 1500;
        activateGoldVipTheme();
        return true;
    }

    return false;
}

function activateGoldVipTheme() {
    state.theme = 'gold';
    if (typeof applyTheme === 'function') applyTheme();
    if (typeof updatePWAManifest === 'function') updatePWAManifest();
    if (typeof saveState === 'function') saveState();

    triggerHaptic(50);
    playGoldLuxuryChime();

    const banner = document.createElement('div');
    banner.className = 'gold-vip-banner';
    const subText = getEasterEggText('goldVipSub', 'Ultra AMOLED & Luxury Gold');
    banner.innerHTML = `
        <span class="gold-vip-crown">👑</span>
        <div class="gold-vip-title">GOLD VIP EDITION</div>
        <div class="gold-vip-sub">${subText}</div>
    `;
    document.body.appendChild(banner);
    setTimeout(() => {
        try { banner.remove(); } catch (_) {}
    }, 2800);
}

function exitGoldVipTheme() {
    state.theme = 'dark';
    if (typeof applyTheme === 'function') applyTheme();
    if (typeof updatePWAManifest === 'function') updatePWAManifest();
    if (typeof saveState === 'function') saveState();
    triggerHaptic(10);
    const toastMsg = getEasterEggText('themeDark', 'Theme: Dark 🌙');
    if (typeof showToast === 'function') showToast(toastMsg);
}

function toggleGoldVipTheme() {
    if (state.theme === 'gold') {
        exitGoldVipTheme();
    } else {
        activateGoldVipTheme();
    }
}

// ============================================================
// EASTER EGG 8: ACCELEROMETER DEVモーション PHYSICS COLLAPSE
// ============================================================

let shakeEnergy = 0;
let lastAcc = { x: 0, y: 0, z: 0 };

function setupAccelerometerEasterEgg() {
    if (typeof window !== 'undefined' && 'ondevicemotion' in window) {
        window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });
    }

    // Keyboard shortcut (Ctrl+Shift+S) for easy desktop testing
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (isPhysicsActive) {
                restorePhysicsCards();
            } else {
                triggerShakePhysics();
            }
        }
    });
}

function handleDeviceMotion(e) {
    const acc = e.accelerationIncludingGravity || e.acceleration;
    if (!acc) return;

    const delta = Math.abs((acc.x || 0) - lastAcc.x) +
                  Math.abs((acc.y || 0) - lastAcc.y) +
                  Math.abs((acc.z || 0) - lastAcc.z);

    lastAcc = { x: acc.x || 0, y: acc.y || 0, z: acc.z || 0 };

    if (isPhysicsActive) {
        if (delta > 8) {
            const impulseScale = Math.min(delta * 0.22, 6.5);
            const signX = (acc.x || 0) < 0 ? 1 : -1;
            const signY = (acc.y || 0) < 0 ? 1 : -1;
            physicsCards.forEach(c => {
                c.vx += signX * impulseScale * (0.8 + Math.random() * 0.4);
                c.vy += signY * impulseScale * (0.8 + Math.random() * 0.4);
                c.vRot += (Math.random() - 0.5) * impulseScale * 1.1;
            });
            if (navigator.vibrate) {
                try { navigator.vibrate([30, 50, 30]); } catch (_) {}
            }
        }
        return;
    }

    if (delta > 13) {
        shakeEnergy += delta * 0.55;
    } else {
        shakeEnergy = Math.max(0, shakeEnergy - 1.5);
    }

    if (shakeEnergy >= 160) {
        shakeEnergy = 0;
        triggerShakePhysics();
    }
}

function triggerShakePhysics() {
    if (isPhysicsActive) return;

    prepareForEasterEggAnimation(() => {
        if (navigator.vibrate) {
            try { navigator.vibrate([30, 50, 30]); } catch (_) {}
        }
        playExplosionSound();
        startCardsPhysics('shake');
    });
}

function startCardsPhysics(mode = 'shake') {
    if (isPhysicsActive) return;
    isPhysicsActive = true;
    isExplosionActive = (mode === 'explosion');

    const domCards = Array.from(document.querySelectorAll('.currency-card'));
    if (!domCards.length) {
        isPhysicsActive = false;
        isExplosionActive = false;
        return;
    }

    const blastCx = window.innerWidth / 2;
    const blastCy = window.innerHeight / 2;

    physicsCards = domCards.map(el => {
        const rect = el.getBoundingClientRect();
        const origX = rect.left;
        const origY = rect.top;
        const w = rect.width;
        const h = rect.height;
        const cx = origX + w / 2;
        const cy = origY + h / 2;

        let vx = 0;
        let vy = 0;
        let vRot = 0;

        if (mode === 'explosion') {
            const dx = cx - blastCx;
            const dy = cy - blastCy;
            const dist = Math.hypot(dx, dy) || 1;
            const nx = dx / dist;
            const ny = dy / dist;
            const blastForce = Math.random() * 5 + 8.5;
            vx = nx * blastForce + (Math.random() - 0.5) * 4;
            vy = ny * blastForce - 5 + (Math.random() - 0.5) * 4;
            vRot = (Math.random() - 0.5) * 14;
        } else {
            vx = (Math.random() - 0.5) * 6;
            vy = Math.random() * 4 + 2;
            vRot = (Math.random() - 0.5) * 8;
        }

        return {
            el,
            origX,
            origY,
            w,
            h,
            cx,
            cy,
            vx,
            vy,
            rot: 0,
            vRot
        };
    });

    showReassembleButton();

    const floor = window.innerHeight - 82;
    const ceiling = 8;
    const leftBound = 6;
    const rightBound = window.innerWidth - 6;
    const gravity = 0.42;

    function stepPhysics() {
        if (!isPhysicsActive) return;

        const maxAllowedHalfW = Math.max(30, (window.innerWidth - 12) / 2);

        for (let i = 0; i < physicsCards.length; i++) {
            const c = physicsCards[i];

            c.vy += gravity;

            // Clamped velocity so blocks never shoot off screen
            c.vx = Math.max(-14, Math.min(14, c.vx));
            c.vy = Math.max(-14, Math.min(14, c.vy));
            c.vRot = Math.max(-12, Math.min(12, c.vRot));

            c.cx += c.vx;
            c.cy += c.vy;
            c.rot += c.vRot;

            // Air damping
            c.vx *= 0.985;
            c.vy *= 0.99;
            c.vRot *= 0.982;

            // Bounding extents of rotated rectangle
            const rad = (c.rot * Math.PI) / 180;
            const cos = Math.abs(Math.cos(rad));
            const sin = Math.abs(Math.sin(rad));
            const halfW = Math.min((c.w * cos + c.h * sin) / 2, maxAllowedHalfW);
            const halfH = (c.w * sin + c.h * cos) / 2;

            // 1. Floor collision & bounce
            if (c.cy + halfH > floor) {
                c.cy = floor - halfH;
                c.vy = -Math.abs(c.vy) * 0.44;
                c.vx *= 0.86;
                // Floor friction creates rotation torque
                c.vRot = (c.vRot * 0.65) + (c.vx * 0.12);
            }

            // 2. Ceiling collision & bounce
            if (c.cy - halfH < ceiling) {
                c.cy = ceiling + halfH;
                c.vy = Math.abs(c.vy) * 0.44;
                c.vx *= 0.86;
                c.vRot = (c.vRot * 0.65) - (c.vx * 0.12);
            }

            // 3. Left wall collision & bounce
            if (c.cx - halfW < leftBound) {
                c.cx = leftBound + halfW;
                c.vx = Math.abs(c.vx) * 0.48;
                c.vRot = (c.vRot * 0.65) + (c.vy * 0.14);
            }

            // 4. Right wall collision & bounce
            if (c.cx + halfW > rightBound) {
                c.cx = rightBound - halfW;
                c.vx = -Math.abs(c.vx) * 0.48;
                c.vRot = (c.vRot * 0.65) - (c.vy * 0.14);
            }

            // 5. Inter-card collision with soft repulsion & tumble
            for (let j = i + 1; j < physicsCards.length; j++) {
                const c2 = physicsCards[j];
                const rad2 = (c2.rot * Math.PI) / 180;
                const cos2 = Math.abs(Math.cos(rad2));
                const sin2 = Math.abs(Math.sin(rad2));
                const halfW2 = Math.min((c2.w * cos2 + c2.h * sin2) / 2, maxAllowedHalfW);
                const halfH2 = (c2.w * sin2 + c2.h * cos2) / 2;

                const dx = c2.cx - c.cx;
                const dy = c2.cy - c.cy;
                const overlapX = (halfW + halfW2) - Math.abs(dx);
                const overlapY = (halfH + halfH2) - Math.abs(dy);

                if (overlapX > 0 && overlapY > 0) {
                    if (overlapY < overlapX) {
                        const sign = dy > 0 ? 1 : -1;
                        const push = overlapY * 0.52;
                        c.cy -= sign * push;
                        c2.cy += sign * push;

                        const relVy = c.vy - c2.vy;
                        if (relVy * sign > 0) {
                            const impulse = relVy * 0.52;
                            c.vy -= impulse;
                            c2.vy += impulse;
                            const torque = Math.max(-5, Math.min(5, (dx / (halfW + 1)) * impulse * 0.22));
                            c.vRot -= torque;
                            c2.vRot += torque;
                        }
                    } else {
                        const sign = dx > 0 ? 1 : -1;
                        const push = overlapX * 0.52;
                        c.cx -= sign * push;
                        c2.cx += sign * push;

                        const relVx = c.vx - c2.vx;
                        if (relVx * sign > 0) {
                            const impulse = relVx * 0.52;
                            c.vx -= impulse;
                            c2.vx += impulse;
                            const torque = Math.max(-5, Math.min(5, (dy / (halfH + 1)) * impulse * 0.22));
                            c.vRot += torque;
                            c2.vRot += torque;
                        }
                    }
                }
            }

            // Render transform
            const curX = c.cx - c.w / 2;
            const curY = c.cy - c.h / 2;
            const tx = curX - c.origX;
            const ty = curY - c.origY;
            c.el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotate(${c.rot.toFixed(1)}deg)`;
            c.el.style.zIndex = '9998';
        }

        physicsAnimId = requestAnimationFrame(stepPhysics);
    }

    if (physicsAnimId) cancelAnimationFrame(physicsAnimId);
    physicsAnimId = requestAnimationFrame(stepPhysics);
}

function showReassembleButton() {
    let reassembleBtn = document.getElementById('reassemble-btn');
    if (!reassembleBtn) {
        reassembleBtn = document.createElement('button');
        reassembleBtn.id = 'reassemble-btn';
        reassembleBtn.className = 'reassemble-btn';
        reassembleBtn.innerHTML = getEasterEggText('reassembleCards', '✨ Put everything back');
        document.body.appendChild(reassembleBtn);
        reassembleBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
        });
        reassembleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            restorePhysicsCards();
        });
    }
}

function restorePhysicsCards() {
    if (!isPhysicsActive) return;
    isPhysicsActive = false;
    isExplosionActive = false;
    if (physicsAnimId) {
        cancelAnimationFrame(physicsAnimId);
        physicsAnimId = null;
    }

    const reassembleBtn = document.getElementById('reassemble-btn');
    if (reassembleBtn) {
        try { reassembleBtn.remove(); } catch (_) {}
    }

    physicsCards.forEach(c => {
        c.el.style.transition = 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)';
        c.el.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
        setTimeout(() => {
            c.el.style.transition = '';
            c.el.style.transform = '';
            c.el.style.zIndex = '';
        }, 680);
    });

    physicsCards = [];
    if (typeof triggerHaptic === 'function') triggerHaptic(20);
}

// ============================================================
// EASTER EGG 9: TRIPLE-CLICK ON ₿ (ROCKET TO THE MOON 🚀 🌕)
// ============================================================

let btcClickCount = 0;
let btcClickResetTimer = null;

function setupBitcoinEasterEgg() {
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!target) return;
        const text = target.textContent || '';
        const isBtcSymbol = text.includes('₿') || (target.closest('.flag') && target.closest('.flag').textContent.includes('₿'));

        if (isBtcSymbol) {
            btcClickCount++;
            clearTimeout(btcClickResetTimer);
            btcClickResetTimer = setTimeout(() => { btcClickCount = 0; }, 650);

            if (btcClickCount >= 3) {
                btcClickCount = 0;
                triggerBitcoinToTheMoon();
            }
        }
    });
}

function triggerBitcoinToTheMoon() {
    prepareForEasterEggAnimation(() => {
        if (navigator.vibrate) {
            try { navigator.vibrate([30, 50, 30]); } catch (_) {}
        }
        playRocketLaunchSound();
        launchGoldConfetti(4500, '₿');

        const rocket = document.createElement('div');
        rocket.className = 'moon-rocket-el';
        rocket.innerHTML = '🚀';
        document.body.appendChild(rocket);
        setTimeout(() => {
            try { rocket.remove(); } catch (_) {}
        }, 2500);

        const banner = document.createElement('div');
        banner.className = 'moon-banner';
        banner.innerHTML = `
            <span class="moon-icon">🚀 🌕</span>
            <div class="moon-title">TO THE MOON!</div>
            <div class="moon-sub">₿ HODL BTC TO 1 000 000 $</div>
        `;
        document.body.appendChild(banner);
        setTimeout(() => {
            try { banner.remove(); } catch (_) {}
        }, 3200);
    });
}

// ============================================================
// MAIN ROUTER FOR INPUT-DRIVEN EASTER EGGS
// ============================================================

function checkInputEasterEggs(cleanVal, inputEl) {
    if (!cleanVal || cleanVal.trim() === '') {
        // Field was completely cleared! Reset session guard so easter eggs can fire again if entered.
        hasEasterEggFired = false;
        lastTriggeredEasterEgg = null;
        return;
    }

    // While field is non-empty / being edited, play strictly ONCE per session!
    if (hasEasterEggFired) {
        return;
    }

    const cleanDigits = cleanVal.replace(/[^0-9]/g, '');

    // 1. «1337» (Matrix Mode)
    if (cleanVal === '1337' || cleanDigits === '1337') {
        hasEasterEggFired = true;
        lastTriggeredEasterEgg = '1337';
        prepareForEasterEggAnimation(() => enterMatrixMode());
        return;
    }

    // 2. «777» (Jackpot)
    if (cleanVal === '777' || cleanDigits === '777') {
        hasEasterEggFired = true;
        lastTriggeredEasterEgg = '777';
        prepareForEasterEggAnimation(() => triggerJackpotEasterEgg());
        return;
    }

    // 3. «80085» — ONLY GIGGLE (хихикать)
    const is80085 = cleanVal === '80085' || cleanDigits === '80085';
    if (is80085) {
        hasEasterEggFired = true;
        lastTriggeredEasterEgg = '80085';
        prepareForEasterEggAnimation(() => triggerGiggleEasterEgg());
        return;
    }

    // 4. «01134» / «1134» — FLIP UPSIDE DOWN (переворачивать)
    const is01134 = cleanVal === '01134' || cleanVal === '1134' || cleanDigits === '01134' || cleanDigits === '1134';
    if (is01134) {
        hasEasterEggFired = true;
        lastTriggeredEasterEgg = '01134';
        prepareForEasterEggAnimation(() => triggerUpsideDownEasterEgg());
        return;
    }
}

// ============================================================
// AUTOMATIC EVENT LISTENERS INITIALIZATION
// ============================================================

setupSplashMinigame();
setupAccelerometerEasterEgg();
setupBitcoinEasterEgg();
