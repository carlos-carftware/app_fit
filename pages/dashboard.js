// ============================================================
// Dashboard Page — Role-conditional home dashboard
// ============================================================

window.DashboardPage = {};

DashboardPage.render = (user) => {
  const role = user.role;
  let content = '';

  if (role === 'superadmin') content = DashboardPage.superadmin(user);
  else if (role === 'gym') content = DashboardPage.gym(user);
  else if (role === 'coach') content = DashboardPage.coach(user);
  else content = DashboardPage.student(user);

  Layout.render({
    page: 'dashboard',
    title: 'Dashboard',
    role, user,
    content
  });
};

DashboardPage.superadmin = (user) => {
  setTimeout(async () => {
    try {
      const el = document.getElementById('dash-superadmin');
      if (!el) return;
      const data = await _apiFetch('/api/dashboard-stats?role=superadmin');

      const gymRows = data.gyms.map(g => `
        <tr>
          <td style="padding:14px 16px;font-weight:600">${g.name}</td>
          <td style="padding:14px">${g.city || '—'}</td>
          <td style="padding:14px">${g.coaches || 0}</td>
          <td style="padding:14px">${g.students || 0}</td>
          <td style="padding:14px">€${g.plan === 'Enterprise' ? 149 : g.plan === 'Pro' ? 99 : 49}</td>
          <td style="padding:14px">${UI.badge(g.plan, g.plan === 'Enterprise' ? 'elite' : g.plan === 'Pro' ? 'intermediate' : 'beginner')}</td>
          <td style="padding:14px">${UI.badge(g.active ? '✅ Activo' : '⏳ Trial', g.active ? 'student' : 'coach')}</td>
        </tr>
      `).join('');

      el.innerHTML = `
        <div class="stats-grid mb-6">
          ${UI.statCard({ label: 'Gimnasios', value: data.totalGyms, change: 'Activos', icon: '🏢', color: 'purple' })}
          ${UI.statCard({ label: 'Coaches', value: data.totalCoaches, change: 'Registrados', icon: '🎽', color: 'blue' })}
          ${UI.statCard({ label: 'Estudiantes', value: data.totalStudents, change: 'Totales', icon: '🏃', color: 'green' })}
          ${UI.statCard({ label: 'Ingresos MRR', value: '€' + data.totalRevenue, change: 'Aprox. Mensual', icon: '💰', color: 'orange' })}
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">📋 Gimnasios Registrados</div>
            <button class="btn btn-primary btn-sm" onclick="UI.toast('Función de alta de gimnasio próximamente','info')">+ Nuevo Gimnasio</button>
          </div>
          <div class="scroll-x">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="border-bottom:1px solid var(--border);font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted)">
                  <th style="padding:10px 16px;text-align:left;font-weight:600">Nombre</th>
                  <th style="padding:10px;text-align:left;font-weight:600">Ciudad</th>
                  <th style="padding:10px;text-align:left;font-weight:600">Coaches</th>
                  <th style="padding:10px;text-align:left;font-weight:600">Estudiantes</th>
                  <th style="padding:10px;text-align:left;font-weight:600">Revenue (Aprox)</th>
                  <th style="padding:10px;text-align:left;font-weight:600">Plan</th>
                  <th style="padding:10px;text-align:left;font-weight:600">Estado</th>
                </tr>
              </thead>
              <tbody>${gymRows || '<tr><td colspan="7" class="text-center p-4 text-muted">No hay gimnasios aún.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      `;
    } catch (e) {
      const el = document.getElementById('dash-superadmin');
      if (el) el.innerHTML = `<div class="card text-danger">Error cargando dashboard: ${e.message}</div>`;
    }
  }, 0);

  return `
    ${UI.pageHeader('Panel Super Admin', 'Vista global de la plataforma')}
    <div id="dash-superadmin">
      <div class="text-center p-8"><span class="animate-spin text-xl">⚡</span><br><br>Cargando analíticas...</div>
    </div>
  `;
};

DashboardPage.gym = (user) => {
  setTimeout(async () => {
    try {
      const el = document.getElementById('dash-gym');
      if (!el) return;
      const data = await _apiFetch(`/api/dashboard-stats?role=gym&gymId=${user.gymId}`);

      const coachRows = data.topCoaches.length > 0
        ? data.topCoaches.map((c, i) => `
          <div class="flex items-center gap-3 mb-3">
            ${UI.avatar(c.name.split(' ').map(n => n[0]).join(''), c.avatarColor || ['av-orange', 'av-cyan', 'av-purple', 'av-green'][i % 4], 40)}
            <div class="flex-1">
              <div class="font-semibold">${c.name}</div>
              <div class="text-sm text-muted">${c.student_count} estudiantes activos</div>
            </div>
          </div>
        `).join('')
        : '<div class="text-muted text-sm pb-2">No hay coaches asignados.</div>';

      el.innerHTML = `
        <div class="stats-grid mb-6">
          ${UI.statCard({ label: 'Coaches Activos', value: data.totalCoaches, change: 'En la plataforma', icon: '🎽', color: 'purple' })}
          ${UI.statCard({ label: 'Estudiantes', value: data.totalStudents, change: 'Inscritos', icon: '🏃', color: 'green' })}
          ${UI.statCard({ label: 'Sesiones Hoy', value: '—', change: 'Próximamente', icon: '📅', color: 'blue' })}
          ${UI.statCard({ label: 'Ingresos Mes', value: '—', change: 'Próximamente', icon: '💰', color: 'orange' })}
        </div>

        <div class="grid-2 gap-4">
          <div class="card">
            <div class="card-header"><div class="card-title">🎽 Top Coaches</div></div>
            ${coachRows}
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">📊 Actividad Semanal</div></div>
            <div class="text-xs text-muted mb-4 pb-2">Esta gráfica estará disponible cuando se registren asistencias en la próxima fase.</div>
            ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d, i) =>
        `<div class="flex items-center gap-3 mb-2 opacity-50">
                <span class="text-sm text-muted" style="width:32px">${d}</span>
                <div style="flex:1;background:var(--bg-input);border-radius:4px;height:8px;overflow:hidden">
                  <div style="height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-light));width:${[10, 5, 15, 8, 12, 4][i]}%;border-radius:4px"></div>
                </div>
              </div>`
      ).join('')}
          </div>
        </div>
      `;
    } catch (e) {
      const el = document.getElementById('dash-gym');
      if (el) el.innerHTML = `<div class="card text-danger">Error cargando dashboard: ${e.message}</div>`;
    }
  }, 0);

  return `
    ${UI.pageHeader('Dashboard Gimnasio', `${user.name}`)}
    <div id="dash-gym">
      <div class="text-center p-8"><span class="animate-spin text-xl">⚡</span><br><br>Cargando analíticas...</div>
    </div>
  `;
};

DashboardPage.coach = (user) => {
  setTimeout(async () => {
    try {
      const el = document.getElementById('dash-coach');
      if (!el) return;
      const data = await _apiFetch(`/api/dashboard-stats?role=coach&id=${user.id}`);

      const studentCards = data.myStudents.length > 0
        ? data.myStudents.map(s => `
          <div class="flex items-center gap-3 mb-3 clickable" style="cursor:pointer" data-navigate="students" data-student="${s.id}">
            ${UI.avatar(s.avatar || s.name[0], s.avatar_color || 'av-green', 40)}
            <div class="flex-1">
              <div class="font-semibold">${s.name}</div>
              <div class="text-sm text-muted">${UI.levelBadge(s.level || 'beginner')}</div>
            </div>
            <div class="text-sm text-muted">0🔥</div>
          </div>
        `).join('')
        : '<div class="text-muted text-sm pb-2">No tienes estudiantes asignados.</div>';

      const quickStudents = data.myStudents.length > 0
        ? data.myStudents.slice(0, 3).map(s => `<div class="flex items-center gap-2 mb-2 w-full">
            ${UI.avatar(s.avatar || s.name[0], s.avatar_color || 'av-green', 32)}
            <span class="text-sm font-semibold flex-1">${s.name}</span>
            ${UI.levelBadge(s.level || 'beginner')}
          </div>`).join('')
        : '';

      el.innerHTML = `
        <div class="stats-grid mb-6">
          ${UI.statCard({ label: 'Mis Estudiantes', value: data.totalStudents, change: 'Asignados', icon: '🏃', color: 'purple' })}
          ${UI.statCard({ label: 'Sesiones Hoy', value: '—', change: 'Próximamente', icon: '📅', color: 'green' })}
          ${UI.statCard({ label: 'Streak Promedio', value: '0🔥', change: '—', icon: '🔥', color: 'orange' })}
          ${UI.statCard({ label: 'Timer Activo', value: 'Off', icon: '⏱️', color: 'blue' })}
        </div>
        
        <div class="grid-2 gap-4">
          <div class="card">
            <div class="card-header">
              <div class="card-title">🏃 Mis Estudiantes</div>
              <button class="btn btn-primary btn-sm" data-navigate="students">Ver todos</button>
            </div>
            ${studentCards}
          </div>
          <div class="flex flex-col gap-4">
            <div class="card">
              <div class="card-header"><div class="card-title">📋 Planificación</div></div>
              <p class="text-secondary text-sm mb-3">Gestiona las rutinas y registra las sesiones de tus estudiantes.</p>
              <div class="flex gap-2 flex-wrap">
                ${quickStudents}
              </div>
              <button class="btn btn-primary w-full mt-2" data-navigate="planning">📋 Ir a Planificación</button>
            </div>
            <div class="card">
              <div class="card-header"><div class="card-title">⏱️ Lanzar Timer</div></div>
              <p class="text-secondary text-sm mb-3">Inicia un timer en vivo. Se sincroniza con los estudiantes automáticamente.</p>
              <div class="timer-type-grid">
                ${['Tabata', 'EMOM', 'AMRAP', 'Custom'].map(t =>
        `<div class="timer-type-btn" data-navigate="timer" style="cursor:pointer">
                    <div class="timer-type-name">${t}</div>
                  </div>`
      ).join('')}
              </div>
              <button class="btn btn-secondary w-full mt-2" data-navigate="timer">🚀 Ir al Timer</button>
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      const el = document.getElementById('dash-coach');
      if (el) el.innerHTML = `<div class="card text-danger">Error cargando dashboard: ${e.message}</div>`;
    }
  }, 0);

  return `
    ${UI.pageHeader('Mi Dashboard', `¡Hola, ${user.name.split(' ')[0]}! 💪`)}
    <div id="dash-coach">
      <div class="text-center p-8"><span class="animate-spin text-xl">⚡</span><br><br>Cargando analíticas...</div>
    </div>
  `;
};

DashboardPage._state = { activePlan: null, selectedDay: null };

DashboardPage.student = (user) => {
  // Show skeleton immediately
  setTimeout(async () => {
    try {
      const [plans, stats] = await Promise.all([
        _apiFetch(`/api/student-routines/${user.id}`),
        _apiFetch(`/api/dashboard-stats?role=student&id=${user.id}`)
      ]);

      const dashHtml = `
        <div class="stats-grid mb-6">
          ${UI.statCard({ label: 'Ejercicios Completados', value: stats.completedSessions, icon: '💪', color: 'purple' })}
          ${UI.statCard({ label: 'Rutinas Asignadas', value: plans.length, icon: '📅', color: 'green' })}
          ${UI.statCard({ label: 'Racha Actual', value: '0🔥', change: '¡Sigue así!', icon: '🔥', color: 'orange' })}
          ${UI.statCard({ label: 'Última Sesión', value: '—', icon: '📅', color: 'blue' })}
        </div>
    
        <div class="grid-2 gap-4">
          <div class="card">
            <div class="card-header"><div class="card-title">💪 Workout Asignado</div></div>
            <p class="text-sm text-muted mb-3">Tu plan actual para esta semana.</p>
            <div id="student-dash-workout-container" style="max-height: 400px; overflow-y: auto;">
                <div class="text-center p-4">
                    <span class="animate-spin text-xl">⚡</span>
                    <div class="text-sm text-muted mt-2">Cargando rutina...</div>
                </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">⏱️ Mi Cronómetro</div></div>
            <p class="text-sm text-muted mb-4">Inicia tu cronómetro cuando empieces a entrenar. También recibirás el timer de tu coach en tiempo real.</p>
            <div class="timer-display" style="padding:24px;margin-bottom:16px;text-align:center">
              <div class="timer-phase text-muted">LISTO</div>
              <div class="timer-countdown font-mono" style="font-size:48px;font-weight:bold;color:var(--text)">00:00</div>
              <div class="timer-round text-sm text-muted mt-2">Esperando que inicies...</div>
            </div>
            <button class="btn btn-success w-full" data-navigate="timer" style="cursor:pointer">▶ Abrir Cronómetro</button>
          </div>
        </div>
      `;

      const dashContainer = document.getElementById('dash-student-content');
      if (dashContainer) dashContainer.innerHTML = dashHtml;

      if (!plans || plans.length === 0) {
        const wContainer = document.getElementById('student-dash-workout-container');
        if (wContainer) wContainer.innerHTML = `
                    <div class="text-center p-4">
                        <div style="font-size:32px;margin-bottom:8px">🧘‍♂️</div>
                        <div class="text-sm text-muted">Aún no tienes un plan asignado.</div>
                    </div>`;
        return;
      }

      DashboardPage._state.activePlan = plans[0]; // The most recent one
      DashboardPage._renderStudentPlan();

    } catch (e) {
      const container = document.getElementById('dash-student-content');
      if (container) container.innerHTML = `<div class="card text-danger">Error cargando rutina: ${e.message}</div>`;
    }
  }, 0);

  return `
    ${UI.pageHeader('Mi Plan de Hoy', `¡Hola, ${user.name.split(' ')[0]}! 🔥`)}
    <div id="dash-student-content">
      <div class="text-center p-8"><span class="animate-spin text-xl">⚡</span><br><br>Cargando analíticas...</div>
    </div>
  `;
};

DashboardPage._renderStudentPlan = () => {
  const container = document.getElementById('student-dash-workout-container');
  if (!container) return;
  const activePlan = DashboardPage._state.activePlan;
  if (!activePlan) return;

  const byDay = {};
  activePlan.exercises.forEach(ex => {
    if (!byDay[ex.day_name]) byDay[ex.day_name] = [];
    byDay[ex.day_name].push(ex);
  });

  const days = Object.keys(byDay);
  if (days.length === 0) {
    container.innerHTML = `<div class="text-muted">No hay ejercicios en este plan.</div>`;
    return;
  }

  if (!DashboardPage._state.selectedDay || !days.includes(DashboardPage._state.selectedDay)) {
    DashboardPage._state.selectedDay = days[0];
  }

  const selectedDay = DashboardPage._state.selectedDay;
  const exercises = byDay[selectedDay] || [];

  // Render Day Tabs
  const tabsHtml = `
    <div class="flex gap-2 mb-4 overflow-x-auto pb-2" style="border-bottom: 1px solid var(--border);">
       ${days.map(d => `
           <button class="btn btn-sm ${d === selectedDay ? 'btn-primary' : 'btn-ghost'} day-tab-btn" data-day="${d}">
               ${d}
           </button>
       `).join('')}
    </div>
  `;

  // Render Exercises
  let exHtml = `<div class="flex flex-col gap-3">`;

  const groups = {};
  exercises.forEach(ex => {
    const g = ex.group_name || '';
    if (!groups[g]) groups[g] = [];
    groups[g].push(ex);
  });

  for (let gName in groups) {
    if (gName) {
      exHtml += `<div class="text-[11px] font-bold text-muted mt-3 mb-1 uppercase tracking-wide flex items-center gap-1"><span style="opacity:0.5">🏷️</span> ${gName}</div>`;
    }
    groups[gName].forEach(ex => {
      let timerBtn = '';
      if (ex.timer_type && !ex.completed) {
        const tcfg = typeof ex.timer_config === 'string' ? ex.timer_config : JSON.stringify(ex.timer_config || {});
        timerBtn = `<button class="btn btn-sm btn-primary launch-smartwod-btn" data-type="${ex.timer_type}" data-cfg='${tcfg}' title="Iniciar Timer">▶️ Timer</button>`;
      }

      exHtml += `
        <div class="exercise-card relative flex justify-between items-center transition" style="background:var(--bg-input); ${ex.completed ? 'opacity: 0.6; filter: grayscale(1);' : ''}">
            <div class="flex-1">
                <div class="font-bold text-sm mb-1 ${ex.completed ? 'line-through text-muted' : ''}">${ex.exercise_name}</div>
                <div class="text-xs text-muted mb-2">
                    <span class="badge badge-info">${ex.sets}</span> 
                    <span class="badge badge-neutral">${ex.reps}</span> 
                    <span class="ml-2">⏱️ ${ex.rest || '—'}</span>
                </div>
                <div class="flex gap-2">
                    ${timerBtn}
                    <button class="btn btn-sm ${ex.completed ? 'btn-secondary' : 'btn-success'} toggle-complete-btn" data-id="${ex.id}" data-st="${ex.completed ? 1 : 0}">
                        ${ex.completed ? '↺ Desmarcar' : '✅ Completar'}
                    </button>
                </div>
            </div>
        </div>
      `;
    });
  }
  exHtml += `</div>`;

  container.innerHTML = `
    <div class="text-sm font-bold text-accent mb-2">📅 ${activePlan.name}</div>
    ${tabsHtml}
    ${exHtml}
  `;
};

DashboardPage.bindEvents = (user) => {
  document.getElementById('dash-container')?.addEventListener('click', async (e) => {
    if (e.target.closest('[data-navigate]')) {
      const page = e.target.closest('[data-navigate]').dataset.navigate;
      App.navigate(page);
    }
    if (e.target.closest('.launch-smartwod-btn')) {
      const btn = e.target.closest('.launch-smartwod-btn');
      const type = btn.dataset.type;
      const cfg = btn.dataset.cfg;
      sessionStorage.setItem('smartwod_intent', JSON.stringify({ type, config: JSON.parse(cfg) }));
      App.navigate('timer');
    }
    if (e.target.closest('.day-tab-btn')) {
      DashboardPage._state.selectedDay = e.target.closest('.day-tab-btn').dataset.day;
      DashboardPage._renderStudentPlan();
    }
    if (e.target.closest('.toggle-complete-btn')) {
      const btn = e.target.closest('.toggle-complete-btn');
      const id = btn.dataset.id;
      const completed = btn.dataset.st === '0'; // If it was 0, we want to complete it (1)

      btn.disabled = true;
      try {
        await _apiFetch(`/api/student-routine-exercises/${id}/complete`, {
          method: 'PUT',
          body: JSON.stringify({ completed })
        });

        // Update local state and re-render
        if (DashboardPage._state.activePlan) {
          const ex = DashboardPage._state.activePlan.exercises.find(e => e.id == id);
          if (ex) ex.completed = completed ? 1 : 0;
          DashboardPage._renderStudentPlan();
        }
      } catch (err) {
        UI.toast('Error: ' + err.message, 'error');
        btn.disabled = false;
      }
    }
  });
};
