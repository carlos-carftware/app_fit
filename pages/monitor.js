// ============================================================
// Monitor en Vivo — Coach sees all student timers in real-time
// Listens on StudentSync (fitpro-student-monitor BroadcastChannel)
// ============================================================

window.MonitorPage = {};

MonitorPage.render = (user) => {
    const content = MonitorPage.content();
    Layout.render({
        page: 'monitor',
        title: 'Monitor en Vivo',
        role: user.role,
        user,
        content,
        topbarActions: `<div class="flex items-center gap-2">
          <div id="monitor-dot" style="width:10px;height:10px;border-radius:50%;background:var(--text-muted);transition:background .3s"></div>
          <span id="monitor-status" class="text-sm text-secondary">Esperando estudiantes...</span>
        </div>`
    });
    MonitorPage.bindEvents(user);
};

MonitorPage.content = () => `
  ${UI.pageHeader('Monitor en Vivo', 'Vista en tiempo real del entrenamiento de cada estudiante')}

  <!-- Coach timer broadcast strip -->
  <div class="card mb-5" style="background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(6,182,212,.08));border-color:var(--accent)">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <div class="card-title mb-1">📡 Tu Timer de Clase</div>
        <div class="text-sm text-secondary" id="coach-timer-status">Timer inactivo — los estudiantes ven cuando transmites</div>
      </div>
      <button class="btn btn-primary btn-sm" data-navigate="timer">🚀 Ir al Timer del Coach</button>
    </div>
  </div>

  <!-- Students grid -->
  <div class="grid-auto" id="monitor-grid">
    ${MonitorPage.buildInitialCards()}
  </div>

  <!-- Empty state (hidden by default if students exist) -->
  <div id="monitor-empty" style="display:none;text-align:center;padding:60px 20px">
    <div style="font-size:64px;margin-bottom:16px">⏰</div>
    <h3 style="color:var(--text-secondary);margin-bottom:8px">Sin estudiantes activos</h3>
    <p class="text-muted text-sm">Cuando un estudiante inicie su entrenamiento, aparecerá aquí en tiempo real.</p>
  </div>
`;

// Build initial cards from mock data (offline state)
MonitorPage.buildInitialCards = () => {
    return MOCK_STUDENTS.map(s => {
        const workout = MOCK_WORKOUTS.find(w => w.id === s.plan.workoutId);
        return MonitorPage.studentCard(s.id, {
            studentId: s.id,
            studentName: s.name,
            studentAvatar: s.avatar,
            studentAvatarColor: s.avatarColor,
            workoutName: workout?.name || '—',
            exerciseName: '',
            repInfo: '',
            exIdx: 0,
            totalEx: workout?.exercises.length || 0,
            setIdx: 0,
            totalSets: workout?.exercises[0]?.sets || 0,
            phase: 'idle',
            elapsedMs: 0,
            restCountdown: 0,
        });
    }).join('');
};

MonitorPage.studentCard = (studentId, data) => {
    const phaseMap = {
        work: { label: '⚡ EJERCICIO', cls: 'phase-work', bg: 'rgba(16,185,129,.08)', border: 'rgba(16,185,129,.35)' },
        rest: { label: '❄️ DESCANSO', cls: 'phase-rest', bg: 'rgba(6,182,212,.08)', border: 'rgba(6,182,212,.35)' },
        done: { label: '✅ LISTO', cls: 'phase-done', bg: 'rgba(139,92,246,.08)', border: 'rgba(139,92,246,.35)' },
        idle: { label: '⚫ EN ESPERA', cls: '', bg: 'var(--card)', border: 'var(--border)' },
    };
    const pm = phaseMap[data.phase] || phaseMap.idle;
    const progressPercent = data.totalEx > 0 ? Math.round((data.exIdx / data.totalEx) * 100) : 0;
    const setPercent = data.totalSets > 0 ? Math.round(((data.setIdx) / data.totalSets) * 100) : 0;
    const elapsed = MonitorPage.formatElapsed(data.elapsedMs || 0);

    return `
    <div class="card" id="student-monitor-${studentId}"
         style="border-color:${pm.border};background:${pm.bg};transition:all .4s ease">
      <!-- Header: avatar + name + phase -->
      <div class="flex items-center gap-3 mb-3">
        ${UI.avatar(data.studentAvatar, data.studentAvatarColor, 44)}
        <div class="flex-1">
          <div style="font-weight:600;font-size:15px">${data.studentName}</div>
          <div class="text-xs text-muted mt-1">${data.workoutName}</div>
        </div>
        <div class="badge badge-${pm.cls === 'phase-work' ? 'gym' : pm.cls === 'phase-rest' ? 'coach' : 'student'}"
             id="phase-badge-${studentId}" style="white-space:nowrap">
          ${pm.label}
        </div>
      </div>

      <!-- Current exercise -->
      <div id="ex-info-${studentId}" style="background:var(--bg-secondary);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:10px;min-height:44px">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary)" id="ex-name-${studentId}">
          ${data.exerciseName || '—'}
        </div>
        <div class="flex items-center justify-between mt-1">
          <span class="text-xs text-muted" id="rep-info-${studentId}">${data.repInfo || 'Esperando inicio...'}</span>
          <span class="text-xs" style="color:var(--accent);font-family:'JetBrains Mono',monospace" id="elapsed-${studentId}">${elapsed}</span>
        </div>
      </div>

      <!-- Exercise progress -->
      <div class="flex justify-between text-xs text-muted mb-1">
        <span>Ejercicio</span>
        <span id="ex-counter-${studentId}">${data.exIdx + 1} / ${data.totalEx}</span>
      </div>
      <div style="background:var(--bg-secondary);height:6px;border-radius:3px;overflow:hidden;margin-bottom:10px">
        <div id="ex-bar-${studentId}" style="height:100%;background:var(--accent);border-radius:3px;width:${progressPercent}%;transition:width .6s ease"></div>
      </div>

      <!-- Set progress -->
      <div class="flex justify-between text-xs text-muted mb-1">
        <span>Series completadas</span>
        <span id="set-counter-${studentId}">${data.setIdx} / ${data.totalSets}</span>
      </div>
      <div style="background:var(--bg-secondary);height:6px;border-radius:3px;overflow:hidden;margin-bottom:10px">
        <div id="set-bar-${studentId}" style="height:100%;background:var(--neon-green);border-radius:3px;width:${setPercent}%;transition:width .6s ease"></div>
      </div>

      <!-- Rest countdown (hidden when not resting) -->
      <div id="rest-display-${studentId}" style="display:${data.phase === 'rest' ? 'flex' : 'none'};align-items:center;justify-content:center;gap:8px;padding:8px;background:rgba(6,182,212,.1);border-radius:var(--radius-sm);border:1px solid rgba(6,182,212,.2)">
        <span style="font-size:13px;color:var(--neon-blue)">❄️ Descansando</span>
        <span id="rest-cd-${studentId}" style="font-family:'JetBrains Mono',monospace;color:var(--neon-blue);font-weight:700">
          ${data.restCountdown > 0 ? data.restCountdown + 's' : ''}
        </span>
      </div>
    </div>`;
};

MonitorPage.formatElapsed = (ms) => {
    if (!ms || ms <= 0) return '00:00';
    const t = Math.floor(ms / 1000);
    const m = Math.floor(t / 60);
    const s = t % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

// Update an existing student card in-place (no full re-render)
MonitorPage.updateCard = (data) => {
    const id = data.studentId;
    const card = document.getElementById('student-monitor-' + id);
    if (!card) return;

    const phaseMap = {
        work: { label: '⚡ EJERCICIO', bg: 'rgba(16,185,129,.08)', border: 'rgba(16,185,129,.35)', badgeCls: 'badge-gym' },
        rest: { label: '❄️ DESCANSO', bg: 'rgba(6,182,212,.08)', border: 'rgba(6,182,212,.35)', badgeCls: 'badge-coach' },
        done: { label: '✅ COMPLETADO', bg: 'rgba(139,92,246,.08)', border: 'rgba(139,92,246,.35)', badgeCls: 'badge-student' },
        idle: { label: '⚫ EN ESPERA', bg: 'var(--card)', border: 'var(--border)', badgeCls: 'badge-student' },
    };
    const pm = phaseMap[data.phase] || phaseMap.idle;

    // Card border + bg
    card.style.borderColor = pm.border;
    card.style.background = pm.bg;

    // Phase badge
    const badge = document.getElementById('phase-badge-' + id);
    if (badge) { badge.textContent = pm.label; badge.className = 'badge ' + pm.badgeCls; }

    // Exercise info
    const exName = document.getElementById('ex-name-' + id);
    if (exName) exName.textContent = data.exerciseName || '—';

    const repInfo = document.getElementById('rep-info-' + id);
    if (repInfo) repInfo.textContent = data.repInfo || (data.phase === 'idle' ? 'En espera...' : '');

    // Elapsed
    const elapsed = document.getElementById('elapsed-' + id);
    if (elapsed) elapsed.textContent = MonitorPage.formatElapsed(data.elapsedMs);

    // Exercise progress
    const totalEx = data.totalEx || 1;
    const exPct = Math.round(((data.phase === 'done' ? totalEx : data.exIdx) / totalEx) * 100);
    const exCounter = document.getElementById('ex-counter-' + id);
    if (exCounter) exCounter.textContent = (data.phase === 'done' ? totalEx : data.exIdx + 1) + ' / ' + totalEx;
    const exBar = document.getElementById('ex-bar-' + id);
    if (exBar) exBar.style.width = exPct + '%';

    // Set progress
    const totalSets = data.totalSets || 1;
    const setPct = Math.round((data.setIdx / totalSets) * 100);
    const setCounter = document.getElementById('set-counter-' + id);
    if (setCounter) setCounter.textContent = data.setIdx + ' / ' + totalSets;
    const setBar = document.getElementById('set-bar-' + id);
    if (setBar) setBar.style.width = setPct + '%';

    // Rest display
    const restDisp = document.getElementById('rest-display-' + id);
    if (restDisp) restDisp.style.display = data.phase === 'rest' ? 'flex' : 'none';
    const restCd = document.getElementById('rest-cd-' + id);
    if (restCd) restCd.textContent = data.restCountdown > 0 ? data.restCountdown + 's' : '';
};

MonitorPage.bindEvents = (user) => {
    let activeCount = 0;

    const unsubscribe = StudentSync.onStudentUpdate((data) => {
        if (data.type !== 'student-workout') return;

        // Update the card
        MonitorPage.updateCard(data);

        // Update status dot
        const dot = document.getElementById('monitor-dot');
        const status = document.getElementById('monitor-status');
        if (data.phase !== 'idle' && data.phase !== 'done') {
            if (dot) { dot.style.background = 'var(--neon-green)'; dot.style.animation = 'pulse 1s ease-in-out infinite'; }
            if (status) status.textContent = '🟢 Estudiantes entrenando en vivo';
        } else {
            if (dot) { dot.style.background = 'var(--text-muted)'; dot.style.animation = 'none'; }
        }
    });

    // Also listen to coach timer to update the strip
    const unsubscribeCoach = TimerSync.onUpdate((data) => {
        const statusEl = document.getElementById('coach-timer-status');
        if (!statusEl) { unsubscribeCoach(); return; }
        if (data.phase === 'idle' || !data.running) {
            statusEl.textContent = 'Timer inactivo — transmite desde la página Timer';
        } else {
            const phaseText = data.phase === 'work' ? 'TRABAJO' : data.phase === 'rest' ? 'DESCANSO' : data.phase;
            statusEl.textContent = `📡 Transmitiendo: ${data.type} · ${phaseText} · ${TimerPage.formatTime(data.remaining)} restantes · Ronda ${data.currentRound}/${data.rounds}`;
        }
    });

    document.addEventListener('fitpro-navigate', () => {
        if (typeof unsubscribe === 'function') unsubscribe();
        if (typeof unsubscribeCoach === 'function') unsubscribeCoach();
    }, { once: true });
};
