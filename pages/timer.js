// ============================================================
// TimerPage — FitPro SaaS
// ============================================================

window.TimerPage = {};

TimerPage.formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// ── GLOBAL TIMER ENGINE (Persistent across navigation) ────────
window.GlobalTimer = {
    interval: null,
    mode: null, // 'coach' or 'student-local'
    state: { running: false, phase: 'idle', type: '', rounds: 0, currentRound: 0, timeRemaining: 0, workDur: 0, restDur: 0 },

    start: function (mode, config) {
        clearInterval(this.interval);
        this.mode = mode;
        this.state = {
            running: true,
            phase: 'work',
            type: config.type,
            rounds: config.rounds,
            currentRound: 1,
            timeRemaining: config.workDur,
            workDur: config.workDur,
            restDur: config.restDur
        };
        window.AudioHelper?.workBeep();
        this.tick();
        this.interval = setInterval(() => this.tick(), 1000);
    },

    pause: function () {
        if (this.state.phase === 'idle') return;
        this.state.running = !this.state.running;
        this.updateUI();
    },

    stop: function () {
        clearInterval(this.interval);
        this.state = { running: false, phase: 'idle', type: '', rounds: 0, currentRound: 0, timeRemaining: 0, workDur: 0, restDur: 0 };

        // Final UI cleanup before resetting mode
        this.updateUI();

        this.mode = null;
    },

    tick: function () {
        if (!this.state.running) return;
        const s = this.state;

        if (s.timeRemaining > 0) {
            s.timeRemaining--;
            if (s.timeRemaining <= 3 && s.timeRemaining > 0) window.AudioHelper?.countBeep();
        } else {
            if (s.phase === 'work') {
                if (s.restDur > 0 && s.currentRound < s.rounds) {
                    s.phase = 'rest';
                    s.timeRemaining = s.restDur;
                    window.AudioHelper?.restBeep();
                } else if (s.currentRound >= s.rounds) {
                    window.AudioHelper?.finishBeep();
                    if (this.mode === 'student-local') UI.toast('¡Rutina Completada!', 'success');
                    this.stop();
                    return; // Stop execution
                } else {
                    s.currentRound++;
                    s.timeRemaining = s.workDur;
                    window.AudioHelper?.workBeep();
                }
            } else if (s.phase === 'rest' || s.phase === 'idle') {
                if (s.currentRound >= s.rounds) {
                    window.AudioHelper?.finishBeep();
                    this.stop();
                    return;
                } else {
                    s.currentRound++;
                    s.phase = 'work';
                    s.timeRemaining = s.workDur;
                    window.AudioHelper?.workBeep();
                }
            }
        }
        this.updateUI();
    },

    updateUI: function () {
        const s = this.state;

        // 1. Broadcast if coach
        if (this.mode === 'coach') {
            window.TimerSync.broadcast({
                active: s.running,
                phase: s.phase,
                remaining: s.timeRemaining,
                currentRound: s.currentRound,
                rounds: s.rounds,
                type: s.type
            });
        }

        // 2. Local floating timer
        if (window.Layout && typeof Layout.updateFloatingTimer === 'function') {
            const page = window.App ? window.App.currentPage : '';
            Layout.updateFloatingTimer(s.phase !== 'idle', s.phase, s.timeRemaining, s.currentRound, s.rounds, page);
        }

        // 3. Update DOM if on timer page
        const prefix = this.mode === 'coach' ? 'coach' : 'loc';
        const timeEl = document.getElementById(`${prefix}-timer-time`);
        const phaseEl = document.getElementById(`${prefix}-timer-phase`);
        const roundEl = document.getElementById(`${prefix}-timer-round`);

        if (timeEl) {
            timeEl.textContent = TimerPage.formatTime(s.timeRemaining);
            timeEl.style.color = s.phase === 'work' ? 'var(--success)' : s.phase === 'rest' ? 'var(--warning)' : '#fff';
        }
        if (roundEl) {
            roundEl.textContent = this.mode === 'coach' ? `${s.currentRound}/${s.rounds}` : `1/${s.rounds}`; // Student has different format? Let's unify.
            roundEl.textContent = `${s.currentRound || 0}/${s.rounds || 0}`;
        }
        if (phaseEl) {
            let pText = s.phase === 'work' ? 'TRABAJO' : s.phase === 'rest' ? 'DESCANSO' : 'LISTO';
            if (!s.running && s.phase !== 'idle') pText = 'PAUSADO';
            phaseEl.textContent = pText;
        }

        // Update Buttons if they exist
        const pauseBtn = document.getElementById(`btn-${this.mode === 'coach' ? 'pause-timer' : 'loc-pause'}`);
        if (pauseBtn) {
            pauseBtn.textContent = s.running ? '⏸️ Pausa' : '▶️ Reanudar';
        }

        const startBtn = document.getElementById(`btn-${this.mode === 'coach' ? 'start-timer' : 'loc-start'}`);
        if (startBtn && this.mode === 'student-local') {
            startBtn.disabled = s.phase !== 'idle';
            const pauseBtn2 = document.getElementById('btn-loc-pause');
            const stopBtn2 = document.getElementById('btn-loc-stop');
            if (pauseBtn2) pauseBtn2.disabled = s.phase === 'idle';
            if (stopBtn2) stopBtn2.disabled = s.phase === 'idle';
        }
    }
};

// Re-sync on navigate if GlobalTimer is active
document.addEventListener('fitpro-navigate', () => {
    if (window.GlobalTimer.state.phase !== 'idle') {
        setTimeout(() => window.GlobalTimer.updateUI(), 100);
    } else {
        // Hide float explicitly if idle
        if (window.Layout && typeof Layout.updateFloatingTimer === 'function') {
            Layout.updateFloatingTimer(false, 'idle', 0, 0, 0, window.App ? window.App.currentPage : '');
        }
    }
});

// Sync remote broadcasts globally to floating timer (for students viewing coach timer)
if (!window._timerSyncGlobalBound) {
    window._timerSyncGlobalBound = true;
    window.TimerSync.onUpdate((data) => {
        // If we are overriding with a local timer, ignore broadcast
        if (window.GlobalTimer && window.GlobalTimer.mode === 'student-local' && window.GlobalTimer.state.phase !== 'idle') return;

        // Update floating timer
        if (window.Layout && typeof Layout.updateFloatingTimer === 'function') {
            const page = window.App ? window.App.currentPage : '';
            Layout.updateFloatingTimer(data.phase !== 'idle' && (data.active || data.remaining > 0), data.phase, data.remaining, data.currentRound, data.rounds, page);
        }

        // Try to update student page if it's there
        const timeEl = document.getElementById('stu-timer-time');
        const phaseEl = document.getElementById('stu-timer-phase');
        const roundEl = document.getElementById('stu-timer-round');
        const typeEl = document.getElementById('stu-timer-type');

        if (timeEl) {
            timeEl.textContent = TimerPage.formatTime(data.remaining);
            timeEl.style.color = data.phase === 'work' ? 'var(--success)' : data.phase === 'rest' ? 'var(--warning)' : '#fff';
        }
        if (roundEl) roundEl.textContent = `${data.currentRound}/${data.rounds}`;
        if (typeEl) typeEl.textContent = data.type || '—';
        if (phaseEl) {
            let phaseText = data.phase === 'work' ? 'TRABAJO' : data.phase === 'rest' ? 'DESCANSO' : 'ESPERANDO';
            if (!data.active && data.remaining > 0) phaseText += ' (PAUSADO)';
            phaseEl.textContent = phaseText;
        }
    });
}

// ── Coach Interface ──────────────────────────────────────────
TimerPage.render = (user) => {
    const configHtml = `
      <div class="card mb-6">
        <div class="card-header"><div class="card-title">⚙️ Configuración del Timer</div></div>
        <div class="form-grid form-grid-2 mt-4">
          ${UI.formGroup('Tipo de Rutina', UI.select('timer-type', ['EMOM', 'AMRAP', 'Tabata', 'Custom'], 'Tabata'))}
          ${UI.formGroup('Rondas', UI.input({ id: 'timer-rounds', type: 'number', value: '8', min: '1' }))}
          ${UI.formGroup('Tiempo de Trabajo (s o m:s)', UI.input({ id: 'timer-work', type: 'text', value: '20' }))}
          ${UI.formGroup('Tiempo de Descanso (s o m:s)', UI.input({ id: 'timer-rest', type: 'text', value: '10' }))}
        </div>
        <div class="mt-5 flex gap-3">
          <button class="btn btn-success" id="btn-start-timer" style="flex:1">▶️ Iniciar y Transmitir</button>
          <button class="btn btn-primary" id="btn-tv-mode" style="flex:1">📺 Abrir Pantalla TV</button>
        </div>
      </div>
    `;

    const displayHtml = `
      <div class="card text-center" style="background:#000; color:#fff;">
        <div class="text-sm font-bold text-muted mb-2" id="coach-timer-phase">STANDBY</div>
        <div id="coach-timer-time" class="font-mono" style="font-size: 80px; font-weight: bold; line-height: 1; color: var(--success);">00:00</div>
        <div class="text-xs text-muted mt-2">Ronda <span id="coach-timer-round">0/0</span> | Tipo: <span id="coach-timer-type-label">N/A</span></div>
        <div class="mt-6 flex justify-center gap-3">
           <button class="btn btn-secondary btn-sm" id="btn-pause-timer">⏸️ Pausa</button>
           <button class="btn btn-danger btn-sm" id="btn-stop-timer">⏹️ Detener</button>
        </div>
      </div>
    `;

    Layout.render({
        page: 'timer',
        title: 'Timer en Vivo',
        role: user.role,
        user,
        content: `
            ${UI.pageHeader('⏱️ Control de Cronómetro', 'Configura y transmite el timer a tus alumnos en tiempo real.')}
            <div class="grid-2 gap-4">
                ${configHtml}
                ${displayHtml}
            </div>
            <div class="text-xs text-muted mt-4">💡 El cronómetro que inicies aquí se sincronizará automáticamente en los dispositivos de los alumnos y en la Pantalla TV.</div>
        `
    });

    TimerPage._bindEvents(user);
    if (window.GlobalTimer.mode === 'coach') {
        window.GlobalTimer.updateUI(); // Reflect current running state
    }
};

TimerPage._bindEvents = (user) => {
    document.getElementById('btn-start-timer')?.addEventListener('click', () => {
        const type = document.querySelector('select[name="timer-type"]').value;
        const rounds = parseInt(document.getElementById('timer-rounds').value) || 1;
        const workDur = UI.parseTimeToSeconds(document.getElementById('timer-work').value) || 20;
        const restDur = UI.parseTimeToSeconds(document.getElementById('timer-rest').value) || 0;

        document.getElementById('coach-timer-type-label').textContent = type;

        window.GlobalTimer.start('coach', { type, rounds, workDur, restDur });
    });

    document.getElementById('btn-pause-timer')?.addEventListener('click', () => {
        window.GlobalTimer.pause();
    });

    document.getElementById('btn-stop-timer')?.addEventListener('click', () => {
        window.GlobalTimer.stop();
        document.getElementById('coach-timer-phase').textContent = 'STANDBY';
        document.getElementById('coach-timer-time').textContent = '00:00';
    });

    document.getElementById('btn-tv-mode')?.addEventListener('click', () => {
        window.open('?page=timer-display', '_blank');
    });
};

// ── Student Interface ────────────────────────────────────────
TimerPage.renderStudentTimer = (user) => {
    const storedIntent = sessionStorage.getItem('smartwod_intent');
    if (storedIntent) {
        try {
            const intent = JSON.parse(storedIntent);
            sessionStorage.removeItem('smartwod_intent');
            // If they just clicked a local timer, make sure any other is cleared
            if (window.GlobalTimer.mode !== 'student-local' || window.GlobalTimer.state.phase === 'idle') {
                return TimerPage._renderLocalStudentTimer(user, intent);
            }
        } catch (e) { }
    }

    // Resume local timer if exists
    if (window.GlobalTimer.mode === 'student-local' && window.GlobalTimer.state.phase !== 'idle') {
        const intent = { type: window.GlobalTimer.state.type, config: { rounds: window.GlobalTimer.state.rounds, work: window.GlobalTimer.state.workDur, rest: window.GlobalTimer.state.restDur } };
        return TimerPage._renderLocalStudentTimer(user, intent);
    }

    const content = `
      ${UI.pageHeader('Tu Cronómetro (En Vivo)', 'Este timer se sincroniza automáticamente con tu entrenador.')}
      <div class="card text-center" style="background:#111; color:#fff; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div id="stu-timer-phase" class="text-xl font-bold mb-4" style="color:var(--text-muted); letter-spacing: 2px;">ESPERANDO AL COACH</div>
        <div id="stu-timer-time" class="font-mono" style="font-size: 120px; font-weight: bold; line-height: 1;">00:00</div>
        <div class="flex justify-center gap-8 mt-6">
            <div class="text-left">
                <div class="text-xs text-muted uppercase">Ronda</div>
                <div id="stu-timer-round" class="text-2xl font-bold">0/0</div>
            </div>
            <div class="text-left">
                <div class="text-xs text-muted uppercase">Tipo</div>
                <div id="stu-timer-type" class="text-2xl font-bold">—</div>
            </div>
        </div>
      </div>
    `;

    Layout.render({ page: 'timer', title: 'Mi Timer', role: user.role, user, content });
};

TimerPage._renderLocalStudentTimer = (user, intent) => {
    const type = intent.type || 'Custom';
    const config = intent.config || {};
    const rounds = parseInt(config.rounds) || 1;
    let workDur = parseInt(config.work) || 0;
    let restDur = parseInt(config.rest) || 0;

    // Adapt AMRAP/FOR TIME defaults if needed
    if (type === 'AMRAP' || type === 'FOR_TIME') {
        if (!workDur && config.rounds && !config.work) workDur = parseInt(config.rounds) * 60; // fallback if rounds cap
        workDur = workDur || 600; // default 10 min
        restDur = 0;
    }

    const content = `
      ${UI.pageHeader('SmartWOD Local', `Ejecutando: ${type}`)}
      <div class="card text-center" style="background:#111; color:#fff; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div id="loc-timer-phase" class="text-xl font-bold mb-4" style="color:var(--text-muted); letter-spacing: 2px;">LISTO</div>
        <div id="loc-timer-time" class="font-mono" style="font-size: 100px; font-weight: bold; line-height: 1; color:#fff;">00:00</div>
        
        <div class="flex justify-center gap-8 mt-6">
            <div class="text-left">
                <div class="text-xs text-muted uppercase">Ronda</div>
                <div id="loc-timer-round" class="text-2xl font-bold">1/${rounds}</div>
            </div>
            <div class="text-left">
                <div class="text-xs text-muted uppercase">Tipo</div>
                <div class="text-2xl font-bold">${type}</div>
            </div>
        </div>

        <div class="mt-8 flex justify-center gap-3">
           <button class="btn btn-primary" id="btn-loc-start">▶️ Iniciar</button>
           <button class="btn btn-secondary" id="btn-loc-pause" disabled>⏸️ Pausa</button>
           <button class="btn btn-danger" id="btn-loc-stop" disabled>⏹️ Salir</button>
        </div>
      </div>
    `;

    Layout.render({ page: 'timer', title: 'SmartWOD', role: user.role, user, content });

    if (window.GlobalTimer.mode === 'student-local') {
        // Reflected currently running State
        document.getElementById('loc-timer-time').textContent = TimerPage.formatTime(window.GlobalTimer.state.timeRemaining);
        window.GlobalTimer.updateUI();
    } else {
        document.getElementById('loc-timer-time').textContent = TimerPage.formatTime(workDur);
    }

    document.getElementById('btn-loc-start').addEventListener('click', () => {
        window.GlobalTimer.start('student-local', { type, rounds, workDur, restDur });
    });

    document.getElementById('btn-loc-pause').addEventListener('click', () => {
        window.GlobalTimer.pause();
    });

    document.getElementById('btn-loc-stop').addEventListener('click', () => {
        window.GlobalTimer.stop();
        App.navigate('dashboard');
    });
};

// ── TV Display Interface (Gym / Monitor) ──────────────────────
TimerPage.renderDisplay = (user) => {
    document.body.innerHTML = `
      <div style="background:#000; color:#fff; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center;">
        <div id="tv-timer-phase" style="font-size: 5vw; font-weight:bold; color:var(--text-muted); letter-spacing: 5px; margin-bottom: 2vh;">ESPERANDO</div>
        <div id="tv-timer-time" class="font-mono" style="font-size: 35vw; font-weight:bold; line-height:0.8;">00:00</div>
        <div style="font-size: 4vw; margin-top: 4vh; display:flex; gap: 10vw;">
            <div>RONDA: <span id="tv-timer-round" class="font-bold">0/0</span></div>
            <div><span id="tv-timer-type" class="font-bold" style="color:var(--accent);">—</span></div>
        </div>
      </div>
    `;

    // The global timer sync will capture the updates! (assuming Layout is not fully rendering, we just fetch using our global event)
    const sync = window.TimerSync;
    const timeEl = document.getElementById('tv-timer-time');
    const phaseEl = document.getElementById('tv-timer-phase');
    const roundEl = document.getElementById('tv-timer-round');
    const typeEl = document.getElementById('tv-timer-type');

    sync.onUpdate((data) => {
        if (!timeEl) return;
        timeEl.textContent = TimerPage.formatTime(data.remaining);
        roundEl.textContent = `${data.currentRound}/${data.rounds}`;
        typeEl.textContent = data.type || '—';

        let phaseText = data.phase === 'work' ? '¡TRABAJO!' : data.phase === 'rest' ? 'DESCANSO' : 'ESPERANDO';
        if (!data.active && data.remaining > 0) phaseText = 'PAUSADO';
        phaseEl.textContent = phaseText;

        timeEl.style.color = data.phase === 'work' ? '#4ade80' : data.phase === 'rest' ? '#f59e0b' : '#fff';
    });
};
