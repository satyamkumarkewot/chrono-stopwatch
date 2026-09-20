/**
 * Precision Stopwatch Application - JavaScript Logic
 * Features: High-precision performance.now() timer, lap splits, fast/slow analytics,
 * theme persistence, Web Audio API sound feedback, keyboard shortcuts.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const htmlEl = document.documentElement;
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    
    // Display Elements
    const timerCard = document.querySelector('.timer-card');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const millisecondsEl = document.getElementById('milliseconds');
    const timerStatusEl = document.getElementById('timerStatus');
    const ringProgressEl = document.getElementById('ringProgress');
    
    // Control Buttons
    const startPauseBtn = document.getElementById('startPauseBtn');
    const startPauseBtnLabel = document.getElementById('startPauseBtnLabel');
    const playIcon = startPauseBtn.querySelector('.play-icon');
    const pauseIcon = startPauseBtn.querySelector('.pause-icon');
    
    const lapResetBtn = document.getElementById('lapResetBtn');
    const lapResetBtnLabel = document.getElementById('lapResetBtnLabel');
    
    // Stats & Laps Elements
    const statTotalLaps = document.getElementById('statTotalLaps');
    const statFastestLap = document.getElementById('statFastestLap');
    const statAvgLap = document.getElementById('statAvgLap');
    const clearLapsBtn = document.getElementById('clearLapsBtn');
    const emptyLapsState = document.getElementById('emptyLapsState');
    const lapsTable = document.getElementById('lapsTable');
    const lapsTableBody = document.getElementById('lapsTableBody');

    // --- State Variables ---
    let isRunning = false;
    let startTime = 0;
    let elapsedTime = 0;
    let animationFrameId = null;
    let laps = []; // Array of { lapNumber, lapTime, totalTime }
    let soundEnabled = true;
    let audioCtx = null;

    const RING_CIRCUMFERENCE = 2 * Math.PI * 126; // 791.68px

    // SVG Gradient Definition Injection for Progress Ring
    injectSvgGradients();

    // --- Init Theme & Preferences ---
    initTheme();
    initSound();

    // --- Core Timer Logic ---
    function startTimer() {
        if (isRunning) return;
        
        isRunning = true;
        startTime = performance.now() - elapsedTime;
        animationFrameId = requestAnimationFrame(updateTimer);
        
        // Update UI State
        timerCard.classList.remove('is-paused');
        timerCard.classList.add('is-running');
        timerStatusEl.textContent = 'RUNNING';
        
        startPauseBtnLabel.textContent = 'Pause';
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        
        lapResetBtnLabel.textContent = 'Lap';
        lapResetBtn.disabled = false;
        
        playSound(600, 'sine', 0.05);
    }

    function pauseTimer() {
        if (!isRunning) return;
        
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
        
        // Update UI State
        timerCard.classList.remove('is-running');
        timerCard.classList.add('is-paused');
        timerStatusEl.textContent = 'PAUSED';
        
        startPauseBtnLabel.textContent = 'Resume';
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        
        lapResetBtnLabel.textContent = 'Reset';
        lapResetBtn.disabled = false;
        
        playSound(450, 'sine', 0.05);
    }

    function resetTimer() {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
        elapsedTime = 0;
        laps = [];
        
        // Reset Time Display
        updateTimeDisplay(0);
        updateRingProgress(0);
        
        // Reset UI State
        timerCard.classList.remove('is-running', 'is-paused');
        timerStatusEl.textContent = 'READY';
        
        startPauseBtnLabel.textContent = 'Start';
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        
        lapResetBtnLabel.textContent = 'Lap';
        lapResetBtn.disabled = true;
        
        // Reset Laps & Stats
        renderLaps();
        updateStats();
        
        playSound(350, 'sine', 0.08);
    }

    function updateTimer(timestamp) {
        if (!isRunning) return;
        
        elapsedTime = timestamp - startTime;
        updateTimeDisplay(elapsedTime);
        updateRingProgress(elapsedTime);
        
        animationFrameId = requestAnimationFrame(updateTimer);
    }

    function updateTimeDisplay(timeInMs) {
        const totalSeconds = Math.floor(timeInMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = Math.floor((timeInMs % 1000) / 10); // 2-digit ms

        hoursEl.textContent = padZero(hours);
        minutesEl.textContent = padZero(minutes);
        secondsEl.textContent = padZero(seconds);
        millisecondsEl.textContent = padZero(milliseconds);
    }

    function updateRingProgress(timeInMs) {
        // Progress ring completes one full revolution every 60 seconds
        const secondsProgress = (timeInMs % 60000) / 60000;
        const strokeOffset = RING_CIRCUMFERENCE * (1 - secondsProgress);
        ringProgressEl.style.strokeDashoffset = strokeOffset;
    }

    // --- Lap Recording Logic ---
    function recordLap() {
        if (!isRunning) return;

        const currentTotalTime = elapsedTime;
        const previousTotalTime = laps.length > 0 ? laps[0].totalTime : 0;
        const lapTime = currentTotalTime - previousTotalTime;

        const lapNumber = laps.length + 1;
        laps.unshift({ lapNumber, lapTime, totalTime: currentTotalTime });

        renderLaps();
        updateStats();
        playSound(800, 'triangle', 0.04);
    }

    function renderLaps() {
        if (laps.length === 0) {
            emptyLapsState.classList.remove('hidden');
            lapsTable.classList.add('hidden');
            clearLapsBtn.classList.add('hidden');
            lapsTableBody.innerHTML = '';
            return;
        }

        emptyLapsState.classList.add('hidden');
        lapsTable.classList.remove('hidden');
        clearLapsBtn.classList.remove('hidden');

        // Identify Min and Max Lap Times if > 1 lap
        let minLapTime = Infinity;
        let maxLapTime = -Infinity;

        if (laps.length > 1) {
            laps.forEach(l => {
                if (l.lapTime < minLapTime) minLapTime = l.lapTime;
                if (l.lapTime > maxLapTime) maxLapTime = l.lapTime;
            });
        }

        lapsTableBody.innerHTML = laps.map(lap => {
            let rowClass = '';
            let badge = '';

            if (laps.length > 1) {
                if (lap.lapTime === minLapTime) {
                    rowClass = 'lap-fast';
                    badge = '<span class="lap-badge fast">Fastest</span>';
                } else if (lap.lapTime === maxLapTime) {
                    rowClass = 'lap-slow';
                    badge = '<span class="lap-badge slow">Slowest</span>';
                }
            }

            return `
                <tr class="${rowClass}">
                    <td>#${padZero(lap.lapNumber)}</td>
                    <td>${formatTime(lap.lapTime)}${badge}</td>
                    <td>${formatTime(lap.totalTime)}</td>
                </tr>
            `;
        }).join('');
    }

    function updateStats() {
        statTotalLaps.textContent = laps.length;

        if (laps.length === 0) {
            statFastestLap.textContent = '--:--.--';
            statAvgLap.textContent = '--:--.--';
            return;
        }

        const minLapTime = Math.min(...laps.map(l => l.lapTime));
        const totalLapTime = laps.reduce((acc, l) => acc + l.lapTime, 0);
        const avgLapTime = totalLapTime / laps.length;

        statFastestLap.textContent = formatTime(minLapTime);
        statAvgLap.textContent = formatTime(avgLapTime);
    }

    // --- Helpers ---
    function padZero(num, digits = 2) {
        return String(num).padStart(digits, '0');
    }

    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const millis = Math.floor((ms % 1000) / 10);
        return `${padZero(mins)}:${padZero(secs)}.${padZero(millis)}`;
    }

    // --- Event Listeners ---
    startPauseBtn.addEventListener('click', () => {
        if (!isRunning) {
            startTimer();
        } else {
            pauseTimer();
        }
    });

    lapResetBtn.addEventListener('click', () => {
        if (isRunning) {
            recordLap();
        } else if (elapsedTime > 0) {
            resetTimer();
        }
    });

    clearLapsBtn.addEventListener('click', () => {
        laps = [];
        renderLaps();
        updateStats();
        playSound(300, 'sine', 0.05);
    });

    // Theme Toggle
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlEl.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        playSound(700, 'sine', 0.03);
    });

    // Sound Toggle
    soundToggleBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem('soundEnabled', soundEnabled);
        updateSoundUI();
        if (soundEnabled) playSound(600, 'sine', 0.04);
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Prevent action if user is focused inside an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                startPauseBtn.click();
                break;
            case 'KeyL':
                if (isRunning) {
                    e.preventDefault();
                    recordLap();
                }
                break;
            case 'KeyR':
                if (!isRunning && elapsedTime > 0) {
                    e.preventDefault();
                    resetTimer();
                }
                break;
            case 'KeyT':
                e.preventDefault();
                themeToggleBtn.click();
                break;
            case 'KeyM':
                e.preventDefault();
                soundToggleBtn.click();
                break;
        }
    });

    // --- Theme & Sound Helpers ---
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark ? 'dark' : 'light');
        }
    }

    function setTheme(theme) {
        htmlEl.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        const sunIcon = themeToggleBtn.querySelector('.sun-icon');
        const moonIcon = themeToggleBtn.querySelector('.moon-icon');

        if (theme === 'dark') {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        } else {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
    }

    function initSound() {
        const savedSound = localStorage.getItem('soundEnabled');
        if (savedSound !== null) {
            soundEnabled = savedSound === 'true';
        }
        updateSoundUI();
    }

    function updateSoundUI() {
        const soundOnIcon = soundToggleBtn.querySelector('.sound-on-icon');
        const soundOffIcon = soundToggleBtn.querySelector('.sound-off-icon');

        if (soundEnabled) {
            soundOnIcon.classList.remove('hidden');
            soundOffIcon.classList.add('hidden');
        } else {
            soundOnIcon.classList.add('hidden');
            soundOffIcon.classList.remove('hidden');
        }
    }

    // Web Audio API Audio Synthesizer
    function playSound(freq, type = 'sine', duration = 0.05) {
        if (!soundEnabled) return;
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = type;
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (err) {
            // Audio context not allowed or failed silently
        }
    }

    // Dynamic SVG Gradient Definitions for the Timer Ring
    function injectSvgGradients() {
        const svg = document.querySelector('.timer-ring');
        if (!svg) return;

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        defs.innerHTML = `
            <linearGradient id="ringGradientDark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#38bdf8" />
                <stop offset="100%" stop-color="#818cf8" />
            </linearGradient>
            <linearGradient id="ringGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#4f46e5" />
                <stop offset="100%" stop-color="#06b6d4" />
            </linearGradient>
        `;
        
        svg.insertBefore(defs, svg.firstChild);
    }
});
