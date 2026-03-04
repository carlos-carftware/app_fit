// ============================================================
// Planning Page — Coach: Student Plan Management & Session Log
// ============================================================

window.PlanningPage = {};

PlanningPage._state = {
  students: [],
  routines: [],
  currentStudent: null,
  currentPlan: null
};

// ── Main render ────────────────────────────────────────────
PlanningPage.render = async (user) => {
  Layout.render({
    page: 'planning',
    title: 'Planificación',
    role: user.role,
    user,
    content: `
            ${UI.pageHeader('Planificación de Estudiantes', 'Gestiona y ajusta las rutinas asignadas a tus alumnos')}
            <div id="planning-loading" class="text-center mt-5"><span class="animate-spin text-xl">⚡</span> Cargando estudiantes...</div>
            <div id="planning-container" style="display:none;"></div>
        `,
    topbarActions: ''
  });

  try {
    let studentsUrl = `/api/students?gymId=${user.gymId}`;
    if (user.role === 'coach') {
      studentsUrl += `&coachId=${user.id}`;
    }

    const [studentsRes, routinesRes] = await Promise.all([
      _apiFetch(studentsUrl),
      _apiFetch('/api/routines')
    ]);

    PlanningPage._state.students = studentsRes;
    PlanningPage._state.routines = routinesRes;

    const container = document.getElementById('planning-container');
    document.getElementById('planning-loading').style.display = 'none';
    container.style.display = 'block';

    container.innerHTML = PlanningPage.listContent();
    PlanningPage.bindListEvents(user);
  } catch (e) {
    document.getElementById('planning-loading').innerHTML = `<div class="text-danger">Error: ${e.message}</div>`;
  }
};

// ── Student list ──────────────────────────────────────────
PlanningPage.listContent = () => {
  if (PlanningPage._state.students.length === 0) {
    return `<div class="card text-center text-muted py-5">No hay estudiantes activos en el gimnasio.</div>`;
  }

  const cards = PlanningPage._state.students.map(s => {
    const avatarHtml = s.photo_url
      ? `<div style="width:48px;height:48px;border-radius:50%;overflow:hidden;flex-shrink:0;"><img src="${s.photo_url}" alt="Foto" style="width:100%;height:100%;object-fit:cover;"></div>`
      : UI.avatar(s.avatar, s.avatar_color, 48);
    return `
        <div class="card clickable open-plan-btn" data-id="${s.id}" style="cursor:pointer">
          <div class="flex items-center gap-3 mb-3">
            ${avatarHtml}
            <div class="flex-1">
              <div class="student-name font-bold" style="font-size:16px;">${s.name}</div>
              <div class="flex gap-2 mt-1">${UI.levelBadge(s.level)}</div>
            </div>
            <button class="btn btn-secondary btn-sm open-plan-btn" data-id="${s.id}">Ver Plan</button>
          </div>
        </div>
      `;
  }).join('');

  return `
    <div class="flex gap-3 mb-5 flex-wrap">
      ${UI.searchBar('Buscar estudiante...', 'plan-search')}
    </div>
    <div class="grid-auto" id="planning-list">${cards}</div>
  `;
};

// ── Bind list events ───────────────────────────────────────
PlanningPage.bindListEvents = (user) => {
  document.querySelectorAll('.open-plan-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      PlanningPage.renderStudentPlan(id, user);
    });
  });

  const search = document.getElementById('plan-search');
  search?.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    document.querySelectorAll('#planning-list .card').forEach(card => {
      const name = card.querySelector('.student-name')?.textContent.toLowerCase() || '';
      card.style.display = name.includes(q) ? '' : 'none';
    });
  });
};

// ── Student Detail Plan (Assigned Routine + Modifications)
PlanningPage.renderStudentPlan = async (studentId, user) => {
  const s = PlanningPage._state.students.find(st => st.id === studentId);
  if (!s) return;
  PlanningPage._state.currentStudent = s;

  Layout.render({
    page: 'planning', title: 'Plan de Estudiante', role: user.role, user,
    content: `
            <div class="flex items-center gap-3 mb-6">
              <button class="btn btn-secondary btn-sm" id="back-to-planning">← Volver</button>
              <div>
                <h2 class="page-title" style="font-size:22px">${s.name}</h2>
                <div class="flex gap-2 mt-1">${UI.levelBadge(s.level)}</div>
              </div>
            </div>
            <div id="plan-detail-loading" class="text-center mt-5"><span class="animate-spin text-xl">⚡</span> Cargando plan...</div>
            <div id="plan-detail-container" style="display:none;"></div>
        `
  });

  document.getElementById('back-to-planning')?.addEventListener('click', () => PlanningPage.render(user));

  try {
    const assignedRoutine = await _apiFetch(`/api/student-routines/${s.id}`);
    PlanningPage._state.currentPlan = assignedRoutine;

    const container = document.getElementById('plan-detail-container');
    document.getElementById('plan-detail-loading').style.display = 'none';
    container.style.display = 'block';

    container.innerHTML = PlanningPage.detailContent();
    PlanningPage.bindDetailEvents(user);
  } catch (e) {
    document.getElementById('plan-detail-loading').innerHTML = `<div class="text-danger">Error: ${e.message}</div>`;
  }
};

PlanningPage.detailContent = () => {
  const s = PlanningPage._state.currentStudent;
  const plans = PlanningPage._state.currentPlan || []; // Now an array of routines

  // Assign template options
  const workoutOptions = PlanningPage._state.routines.map(w =>
    `<option value="${w.id}">${w.name} (${w.discipline || 'General'} · ${w.level})</option>`
  ).join('');

  let activePlanHtml = '';
  if (plans.length === 0) {
    activePlanHtml = `<div class="text-muted py-4">Este estudiante no tiene ninguna rutina activa. Asígnale una plantilla.</div>`;
  } else {
    // Iterate over all weeks
    plans.forEach((plan, planIndex) => {
      const isLatest = planIndex === 0; // First item is the most recent

      // Group clone exercises by day
      const byDay = {};
      plan.exercises.forEach(ex => {
        if (!byDay[ex.day_name]) byDay[ex.day_name] = [];
        byDay[ex.day_name].push(ex);
      });

      let daysHtml = '';
      for (let d in byDay) {
        daysHtml += `
                    <div class="mb-4 pl-3" style="border-left: 2px solid var(--border);">
                        <h4 style="margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:4px; color:var(--accent); font-weight:bold;">
                            ${d}
                            <span class="text-xs ml-2 cursor-pointer btn-edit-day" style="display:inline-block; padding:2px" data-id="${plan.id}" data-day="${d}" title="Renombrar Día">✏️</span>
                            <span class="text-xs ml-1 cursor-pointer btn-delete-day" style="display:inline-block; padding:2px" data-id="${plan.id}" data-day="${d}" title="Eliminar Día">🗑️</span>
                        </h4>
                        <div class="flex flex-col gap-2">
                `;
        const groups = {};
        byDay[d].forEach(ex => {
          const g = ex.group_name || '';
          if (!groups[g]) groups[g] = [];
          groups[g].push(ex);
        });

        for (let gName in groups) {
          if (gName) {
            daysHtml += `<div class="text-[11px] font-bold text-muted mt-3 mb-2 uppercase tracking-wide flex items-center gap-1"><span style="opacity:0.5">🏷️</span> ${gName}</div>`;
          }
          groups[gName].forEach(ex => {
            let tcfg = {};
            try { tcfg = JSON.parse(ex.timer_config || '{}'); } catch (e) { }
            daysHtml += `
                        <div class="exercise-card relative" style="background:var(--bg-input);">
                            <div class="font-bold text-sm mb-2">${ex.exercise_name}</div>
                            <div class="grid-2 gap-2 mb-2" style="grid-template-columns: 1fr 1.5fr 1fr 1.5fr;">
                                <input class="form-input st-ex-input" data-field="sets" data-id="${ex.id}" style="font-size:12px; padding:4px;" placeholder="Sets (4x)" value="${ex.sets || ''}">
                                <input class="form-input st-ex-input" data-field="reps" data-id="${ex.id}" style="font-size:12px; padding:4px;" placeholder="Reps/Time" value="${ex.reps || ''}">
                                <input class="form-input st-ex-input" data-field="rest" data-id="${ex.id}" style="font-size:12px; padding:4px;" placeholder="Descanso" value="${ex.rest || ''}">
                                <div class="flex gap-2">
                                    <input class="form-input st-ex-input flex-1" data-field="notes" data-id="${ex.id}" style="font-size:12px; padding:4px;" placeholder="Notas / Peso" value="${ex.notes || ''}">
                                    <button class="btn btn-secondary btn-sm btn-save-ex" data-id="${ex.id}" title="Guardar cambios y auditar">💾</button>
                                    <button class="btn btn-ghost btn-sm btn-audit-ex" data-id="${ex.id}" title="Ver auditoría">⏱️</button>
                                </div>
                            </div>
                            <!-- SMARTWOD TIMER CONFIG OVERRIDE -->
                            <div class="mt-2 pt-2" style="border-top: 1px dashed var(--border);">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold text-accent">⏱️ SmartWOD Timer</span>
                                    <select class="form-select st-ex-timer-type" data-id="${ex.id}" style="font-size:11px; padding:2px 10px; width:auto;" onchange="this.parentElement.nextElementSibling.style.display = this.value ? 'grid' : 'none'">
                                        <option value="" ${!ex.timer_type ? 'selected' : ''}>Ninguno</option>
                                        <option value="AMRAP" ${ex.timer_type === 'AMRAP' ? 'selected' : ''}>AMRAP</option>
                                        <option value="EMOM" ${ex.timer_type === 'EMOM' ? 'selected' : ''}>EMOM</option>
                                        <option value="TABATA" ${ex.timer_type === 'TABATA' ? 'selected' : ''}>TABATA</option>
                                        <option value="FOR_TIME" ${ex.timer_type === 'FOR_TIME' ? 'selected' : ''}>FOR TIME</option>
                                    </select>
                                </div>
                                <div class="grid-3 gap-2 mt-2 st-ex-timer-cfg-container" style="display: ${ex.timer_type ? 'grid' : 'none'};">
                                    <input class="form-input st-ex-timer-cfg" data-field="work" data-id="${ex.id}" placeholder="Trabajo (ej 1:30)" value="${UI.formatSecondsToTime(tcfg.work)}" style="font-size:11px; padding:4px;" type="text">
                                    <input class="form-input st-ex-timer-cfg" data-field="rest" data-id="${ex.id}" placeholder="Descanso (s o m:s)" value="${UI.formatSecondsToTime(tcfg.rest)}" style="font-size:11px; padding:4px;" type="text">
                                    <input class="form-input st-ex-timer-cfg" data-field="rounds" data-id="${ex.id}" placeholder="Rondas/Cap(m)" value="${tcfg.rounds || ''}" style="font-size:11px; padding:4px;" type="number">
                                </div>
                            </div>
                        </div>
                    `;
          });
        }
        daysHtml += `</div></div>`;
      }

      activePlanHtml += `
            <div class="card mt-4 ${isLatest ? 'border-accent' : ''}" style="${isLatest ? 'border: 1px solid var(--accent);' : 'opacity: 0.85;'}">
                <div class="card-header w-full flex justify-between cursor-pointer collapse-btn" data-target="plan-body-${plan.id}">
                    <div class="card-title text-accent" style="display:flex; align-items:center;">
                        📅 <span class="ml-2">${plan.name}</span>
                        <span class="text-xs ml-4 cursor-pointer btn-edit-routine" style="display:inline-block; padding:2px" data-id="${plan.id}" data-name="${plan.name}" title="Renombrar Asignación">✏️</span>
                        <span class="text-xs ml-1 cursor-pointer btn-delete-routine" style="display:inline-block; padding:2px" data-id="${plan.id}" title="Eliminar Asignación">🗑️</span>
                    </div>
                    <span class="text-xs text-muted mt-1">
                        ${isLatest ? `<span class="badge badge-success mr-2">Actual</span>` : ''} 
                        Creado: ${new Date(plan.created_at).toLocaleDateString()}
                        <span class="ml-2">▼</span>
                    </span>
                </div>
                <div class="mt-4 plan-body" id="plan-body-${plan.id}" style="display: ${isLatest ? 'block' : 'none'};">
                    ${daysHtml}
                </div>
            </div>`;
    });
  }

  return `
    <div class="grid-2 gap-4">
      <!-- Asignación de rutina -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">💪 Asignar Semanas / Rutina a Estudiante</div>
        </div>
        <p class="text-xs text-muted mb-4">Se creará un nuevo bloque de plan (ej. Semana 2) como copia independiente de la Plantilla Maestra, y se mantendrá el historial de semanas anteriores.</p>
        
        <div class="mb-3">
            ${UI.formGroup('Nombre de la Asignación (Ej: "Semana 1", "Ciclo de Fuerza - Sem2")', UI.input({ id: 'assign-custom-name', placeholder: 'Si dejas en blanco usará el nombre original' }))}
        </div>

        <div class="flex gap-2 mb-4">
          <select class="form-select flex-1" id="assign-workout-select">
            <option value="" disabled selected>-- Selecciona una Plantilla Maestra --</option>
            ${workoutOptions}
          </select>
          <button class="btn btn-primary" id="btn-assign-template">Añadir Plan</button>
        </div>
      </div>
      
      <!-- Panel de Auditoría Lateral (Oculto por defecto) -->
      <div class="card" id="audit-sidebar" style="display:none; position:sticky; top:20px; max-height:80vh; overflow-y:auto;">
        <div class="card-header flex justify-between">
           <div class="card-title">⏱️ Historial de Cambios</div>
           <button class="btn btn-icon btn-ghost" onclick="document.getElementById('audit-sidebar').style.display='none'">✕</button>
        </div>
        <div class="text-xs text-muted mb-3" id="audit-subtitle"></div>
        <div id="audit-logs-container" class="mt-2"></div>
      </div>
    </div>

    <!-- Ejercicios Instanciados (Historial Completo) -->
    <div>
        <h3 class="text-lg font-bold mt-6 mb-2">Historial de Planificación</h3>
        ${activePlanHtml}
    </div>
  `;
};

// ── Bind detail events ────────────────────────────────────
PlanningPage.bindDetailEvents = (user) => {
  const s = PlanningPage._state.currentStudent;

  document.getElementById('btn-assign-template')?.addEventListener('click', async (e) => {
    const routineId = document.getElementById('assign-workout-select').value;
    const customName = document.getElementById('assign-custom-name').value.trim();

    if (!routineId) return UI.toast('Selecciona una plantilla', 'error');

    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'Añadiendo...';

    try {
      await _apiFetch('/api/student-routines', {
        method: 'POST',
        body: JSON.stringify({ studentId: s.id, coachId: user.id, routineId, customName })
      });
      UI.toast('✅ Nueva semana añadida a la planificación.', 'success');
      // Reload the view
      PlanningPage.renderStudentPlan(s.id, user);
    } catch (err) {
      UI.toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Añadir Plan';
    }
  });

  // Delegated events for saving individual cloned exercises and collapsing weeks
  document.getElementById('plan-detail-container')?.addEventListener('click', async (e) => {

    // EDIT AND DELETE ROUTINE (WEEK)
    if (e.target.closest('.btn-delete-routine')) {
      e.stopPropagation();
      const btn = e.target.closest('.btn-delete-routine');
      const id = btn.dataset.id;
      if (!confirm('¿Seguro que quieres borrar esta semana/asignación completa?')) return;
      try {
        btn.textContent = '⏳';
        await _apiFetch(`/api/student-routines/${id}`, { method: 'DELETE' });
        UI.toast('✅ Asignación borrada', 'success');
        PlanningPage.renderStudentPlan(s.id, user);
      } catch (err) { UI.toast(err.message, 'error'); btn.textContent = '🗑️'; }
      return;
    }

    if (e.target.closest('.btn-edit-routine')) {
      e.stopPropagation();
      const btn = e.target.closest('.btn-edit-routine');
      const id = btn.dataset.id;
      const currentName = btn.dataset.name;
      const newName = prompt('Nuevo nombre de la asignación:', currentName);
      if (!newName || newName.trim() === currentName) return;
      try {
        btn.textContent = '⏳';
        await _apiFetch(`/api/student-routines/${id}`, { method: 'PUT', body: JSON.stringify({ name: newName.trim() }) });
        PlanningPage.renderStudentPlan(s.id, user);
      } catch (err) { UI.toast(err.message, 'error'); btn.textContent = '✏️'; }
      return;
    }

    // EDIT AND DELETE DAY
    if (e.target.closest('.btn-delete-day')) {
      e.stopPropagation();
      const btn = e.target.closest('.btn-delete-day');
      const id = btn.dataset.id;
      const day = btn.dataset.day;
      if (!confirm(`¿Borrar todos los ejercicios del ${day}?`)) return;
      try {
        btn.textContent = '⏳';
        await _apiFetch(`/api/student-routines/${id}/days/${encodeURIComponent(day)}`, { method: 'DELETE' });
        UI.toast('✅ Día borrado', 'success');
        PlanningPage.renderStudentPlan(s.id, user);
      } catch (err) { UI.toast(err.message, 'error'); btn.textContent = '🗑️'; }
      return;
    }

    if (e.target.closest('.btn-edit-day')) {
      e.stopPropagation();
      const btn = e.target.closest('.btn-edit-day');
      const id = btn.dataset.id;
      const day = btn.dataset.day;
      const newName = prompt('Nuevo nombre para el día (ej. Día 1, Martes, Torso):', day);
      if (!newName || newName.trim() === day) return;
      try {
        btn.textContent = '⏳';
        await _apiFetch(`/api/student-routines/${id}/days/${encodeURIComponent(day)}`, { method: 'PUT', body: JSON.stringify({ newName: newName.trim() }) });
        PlanningPage.renderStudentPlan(s.id, user);
      } catch (err) { UI.toast(err.message, 'error'); btn.textContent = '✏️'; }
      return;
    }

    // COLLAPSE WEEKS
    if (e.target.closest('.collapse-btn')) {
      const btn = e.target.closest('.collapse-btn');
      const targetId = btn.dataset.target;
      const el = document.getElementById(targetId);
      if (el) {
        const isHidden = el.style.display === 'none';
        el.style.display = isHidden ? 'block' : 'none';
        const icon = btn.querySelector('span.ml-2');
        if (icon) icon.textContent = isHidden ? '▼' : '▶';
      }
      return; // prevent bubbling to other handlers below if we just collapsed
    }

    // SAVE EXERCISE INSTANCE
    if (e.target.closest('.btn-save-ex')) {
      const btn = e.target.closest('.btn-save-ex');
      const exId = btn.dataset.id;

      // Gather values from the DOM inputs for this exId
      const sets = document.querySelector(`.st-ex-input[data-id="${exId}"][data-field="sets"]`).value;
      const reps = document.querySelector(`.st-ex-input[data-id="${exId}"][data-field="reps"]`).value;
      const rest = document.querySelector(`.st-ex-input[data-id="${exId}"][data-field="rest"]`).value;
      const notes = document.querySelector(`.st-ex-input[data-id="${exId}"][data-field="notes"]`).value;

      const timerTypeEl = document.querySelector(`.st-ex-timer-type[data-id="${exId}"]`);
      const timer_type = timerTypeEl ? timerTypeEl.value : '';

      const timer_config = {
        work: UI.parseTimeToSeconds(document.querySelector(`.st-ex-timer-cfg[data-id="${exId}"][data-field="work"]`)?.value || ''),
        rest: UI.parseTimeToSeconds(document.querySelector(`.st-ex-timer-cfg[data-id="${exId}"][data-field="rest"]`)?.value || ''),
        rounds: parseInt(document.querySelector(`.st-ex-timer-cfg[data-id="${exId}"][data-field="rounds"]`)?.value || '') || '',
      };

      btn.disabled = true; btn.textContent = '...';

      try {
        await _apiFetch(`/api/student-routine-exercises/${exId}`, {
          method: 'PUT',
          body: JSON.stringify({ sets, reps, rest, notes, timer_type, timer_config, changedBy: user.id })
        });

        UI.toast('✅ Ajuste guardado (con auditoría)', 'success');
        btn.disabled = false; btn.textContent = '💾';

        // If sidebar is open for this exercise, refresh it
        if (document.getElementById('audit-sidebar').dataset.currentExId === exId) {
          PlanningPage._loadAudit(exId);
        }
      } catch (err) {
        UI.toast(err.message, 'error');
        btn.disabled = false; btn.textContent = '💾';
      }
    }

    // VIEW AUDIT LOGS
    if (e.target.closest('.btn-audit-ex')) {
      const btn = e.target.closest('.btn-audit-ex');
      const exId = btn.dataset.id;
      const exName = btn.closest('.exercise-card').querySelector('.font-bold').textContent;

      const sidebar = document.getElementById('audit-sidebar');
      sidebar.style.display = 'block';
      sidebar.dataset.currentExId = exId;
      document.getElementById('audit-subtitle').textContent = `Auditoría de: ${exName}`;

      PlanningPage._loadAudit(exId);
    }
  });
};

PlanningPage._loadAudit = async (exId) => {
  const container = document.getElementById('audit-logs-container');
  container.innerHTML = '<span class="animate-spin text-sm">⚡</span> Cargando...';

  try {
    const logs = await _apiFetch(`/api/audit-logs?entityType=routine_exercise&entityId=${exId}`);
    if (logs.length === 0) {
      container.innerHTML = '<div class="text-sm text-muted py-3">No hay modificaciones sobre el ejercicio original.</div>';
      return;
    }

    container.innerHTML = logs.map(l => {
      const date = new Date(l.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      return `
                <div style="display:flex; gap:12px; margin-bottom:12px; border-left:2px solid var(--border); padding-left:16px; position:relative;">
                  <div style="position:absolute; left:-6px; top:4px; width:10px; height:10px; border-radius:50%; background:var(--accent);"></div>
                  <div>
                    <div class="text-xs font-semibold">${l.user_name || 'Sistema'}</div>
                    <div class="text-[10px] text-muted mb-1">${date}</div>
                    <div class="text-xs">
                      Cambió <strong>${l.field}</strong>
                      <div style="background:var(--bg-input); padding:2px 6px; border-radius:4px; font-size:11px; margin-top:2px;">
                        <span style="color:var(--danger); text-decoration:line-through;">${l.old_value || '(vacío)'}</span>
                        <span style="margin:0 4px;">→</span>
                        <span style="color:var(--success); font-weight:bold;">${l.new_value || '(vacío)'}</span>
                      </div>
                    </div>
                  </div>
                </div>
            `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="text-danger text-xs">Error: ${err.message}</div>`;
  }
};
