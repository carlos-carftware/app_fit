// ============================================================
// Workouts Page — Exercise Library + Routine Builder + Templates
// ============================================================

window.WorkoutsPage = {};

WorkoutsPage.render = async (user) => {
  Layout.render({
    page: 'workouts',
    title: 'Workouts & Rutinas',
    role: user.role, user,
    content: `
            ${UI.pageHeader('Workouts & Rutinas', 'Construye y gestiona los entrenamientos de tus estudiantes')}
            <div id="workouts-loading" class="text-center mt-5"><span class="animate-spin text-xl">⚡</span> Cargando datos...</div>
            <div id="workouts-container" style="display:none;"></div>
        `,
    topbarActions: `<button class="btn btn-primary btn-sm" id="create-workout-btn" style="display:none;">+ Nueva Rutina</button>`
  });

  try {
    const [exercises, routines] = await Promise.all([
      _apiFetch('/api/exercises'),
      _apiFetch('/api/routines')
    ]);

    WorkoutsPage._state = { exercises, routines, currentDay: 'Día 1', builderExercises: [] };

    document.getElementById('workouts-loading').style.display = 'none';
    document.getElementById('create-workout-btn').style.display = '';
    const container = document.getElementById('workouts-container');
    container.style.display = 'block';

    container.innerHTML = WorkoutsPage.mainContent();
    WorkoutsPage.bindEvents(user);

    // Initial render for builder
    WorkoutsPage.renderBuilderExercises();
  } catch (e) {
    document.getElementById('workouts-loading').innerHTML = `<div class="text-danger">Error al cargar: ${e.message}</div>`;
  }
};

WorkoutsPage.mainContent = () => {
  return `
    ${UI.tabs(['🏗️ Constructor', '📚 Biblioteca de Ejercicios', '📋 Plantillas'], 0, 'wod-tabs')}
    <div class="mt-4" id="wod-tab-content">
        ${WorkoutsPage.builderContent()}
    </div>
  `;
};

// ── BUILDER TAB ───────────────────────────────────────────
WorkoutsPage.builderContent = () => `
  <div class="grid-2 gap-4">
    <div class="card">
      <div class="card-header"><div class="card-title">📝 Guardar como Plantilla</div></div>
      <div class="flex flex-col gap-3">
        ${UI.formGroup('Nombre de la plantilla', UI.input({ placeholder: 'Ej: Definición y Fuerza', id: 'wod-name' }))}
        ${UI.formGroup('Objetivo', UI.input({ placeholder: 'Ej: Fuerza, Hipertrofia...', id: 'wod-goal' }))}
        ${UI.formGroup('Disciplina', UI.select('wod-disc', ['Funcional', 'Bodybuilding', 'Calistenia', 'CrossFit']))}
        ${UI.formGroup('Nivel', UI.select('wod-level', ['Beginner', 'Intermediate', 'Advanced', 'Elite']))}
      </div>
      <div class="divider"></div>
      
      <div class="flex items-center justify-between mb-3">
        <div class="card-title">💪 Ejercicios de la Plantilla</div>
      </div>
      
      <div class="flex gap-2 mb-3">
        <select class="form-select flex-1" id="builder-day-select">
            <option value="Día 1">📅 Día 1</option>
            <option value="Día 2">📅 Día 2</option>
            <option value="Día 3">📅 Día 3</option>
            <option value="Día 4">📅 Día 4</option>
            <option value="Día 5">📅 Día 5</option>
            <option value="Día 6">📅 Día 6</option>
            <option value="Día 7">📅 Día 7</option>
        </select>
        <button class="btn btn-secondary" id="dummy-add-ex-btn">Buscar Ejercicio</button>
      </div>

      <div id="wod-exercise-list" style="min-height: 150px; border: 1px dashed var(--border); padding: 10px; border-radius: 8px;">
        <!-- Filled by JS -->
      </div>
      
      <button class="btn btn-primary w-full mt-4" id="save-workout-btn">💾 Guardar Plantilla (Todos los días)</button>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">🔍 Añadir desde Biblioteca</div></div>
      <div class="mb-3">${UI.searchBar('Buscar para añadir al día seleccionado...', 'builder-search-ex')}</div>
      <div id="builder-lib-list" class="flex flex-col gap-2" style="max-height: 600px; overflow-y: auto;">
        ${WorkoutsPage._renderBuilderLibraryList('')}
      </div>
    </div>
  </div>
`;

WorkoutsPage._renderBuilderLibraryList = (query) => {
  const q = query.toLowerCase();
  const filtered = WorkoutsPage._state.exercises.filter(e => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));

  if (filtered.length === 0) return '<div class="text-muted text-sm text-center py-4">No se encontraron ejercicios.</div>';

  return filtered.map(ex => `
        <div class="exercise-card flex items-center gap-3">
            <div class="flex-1">
                <div class="font-bold text-sm">${ex.name}</div>
                <div class="text-xs text-muted">${ex.category} · ${ex.equipment || 'Sin equipo'}</div>
            </div>
            <button class="btn btn-sm btn-primary add-ex-to-day-btn" data-exid="${ex.id}">+ Al ${WorkoutsPage._state.currentDay}</button>
        </div>
    `).join('');
};

WorkoutsPage.renderBuilderExercises = () => {
  const day = WorkoutsPage._state.currentDay;
  const list = document.getElementById('wod-exercise-list');
  if (!list) return;

  const dayExercises = WorkoutsPage._state.builderExercises.filter(e => e.day_name === day);

  if (dayExercises.length === 0) {
    list.innerHTML = `<div class="text-center text-sm text-muted py-4">No hay ejercicios para el ${day} aún.<br>Añádelos desde el panel derecho.</div>`;
    return;
  }

  list.innerHTML = dayExercises.map((ex, idx) => {
    const catalogEx = WorkoutsPage._state.exercises.find(e => e.id === ex.exercise_id);
    const name = catalogEx ? catalogEx.name : 'Unknown';
    return `
            <div class="exercise-card mb-2" style="background: var(--bg-card); position:relative;">
                <button class="btn btn-icon text-danger remove-ex-btn" data-idx="${WorkoutsPage._state.builderExercises.indexOf(ex)}" style="position:absolute; top:4px; right:4px;">✕</button>
                <div class="font-bold text-sm mb-2" style="padding-right: 20px;">${name}</div>
                <div class="mb-2">
                    <input class="form-input b-ex-input" data-field="group_name" data-idx="${WorkoutsPage._state.builderExercises.indexOf(ex)}" style="font-size:12px; padding:4px; width:100%; border-color:var(--border);" placeholder="Grupo / Sección (Ej: Calentamiento, WOD, Fuerza...)" value="${ex.group_name || ''}">
                </div>
                <div class="grid-2 gap-2 mb-2" style="grid-template-columns: 1fr 1fr 1fr 1.5fr;">
                    <input class="form-input b-ex-input" data-field="sets" data-idx="${WorkoutsPage._state.builderExercises.indexOf(ex)}" style="font-size:12px; padding:4px;" placeholder="Sets (ej: 4x)" value="${ex.sets || ''}">
                    <input class="form-input b-ex-input" data-field="reps" data-idx="${WorkoutsPage._state.builderExercises.indexOf(ex)}" style="font-size:12px; padding:4px;" placeholder="Reps/Time" value="${ex.reps || ''}">
                    <input class="form-input b-ex-input" data-field="rest" data-idx="${WorkoutsPage._state.builderExercises.indexOf(ex)}" style="font-size:12px; padding:4px;" placeholder="Desc (s)" value="${ex.rest || ''}">
                    <input class="form-input b-ex-input" data-field="notes" data-idx="${WorkoutsPage._state.builderExercises.indexOf(ex)}" style="font-size:12px; padding:4px;" placeholder="Peso/Notas" value="${ex.notes || ''}">
                </div>
                <!-- SMARTWOD TIMER CONFIG -->
                <div class="mt-2 pt-2" style="border-top: 1px dashed var(--border);">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-accent">⏱️ SmartWOD Timer</span>
                        <select class="form-select b-ex-timer-type" data-idx="${WorkoutsPage._state.builderExercises.indexOf(ex)}" style="font-size:11px; padding:2px 10px; width:auto;">
                            <option value="" ${!ex.timer_type ? 'selected' : ''}>Ninguno</option>
                            <option value="AMRAP" ${ex.timer_type === 'AMRAP' ? 'selected' : ''}>AMRAP</option>
                            <option value="EMOM" ${ex.timer_type === 'EMOM' ? 'selected' : ''}>EMOM</option>
                            <option value="TABATA" ${ex.timer_type === 'TABATA' ? 'selected' : ''}>TABATA</option>
                            <option value="FOR_TIME" ${ex.timer_type === 'FOR_TIME' ? 'selected' : ''}>FOR TIME</option>
                        </select>
                    </div>
                    ${ex.timer_type ? `
                    <div class="grid-3 gap-2 mt-2">
                        <input class="form-input b-ex-timer-cfg" data-field="work" data-idx="${WorkoutsPage._state.builderExercises.indexOf(ex)}" placeholder="Trabajo (ej 1:30)" value="${UI.formatSecondsToTime(ex.timer_config?.work)}" style="font-size:11px; padding:4px;" type="text">
                        <input class="form-input b-ex-timer-cfg" data-field="rest" data-idx="${WorkoutsPage._state.builderExercises.indexOf(ex)}" placeholder="Descanso (s o m:s)" value="${UI.formatSecondsToTime(ex.timer_config?.rest)}" style="font-size:11px; padding:4px;" type="text">
                        <input class="form-input b-ex-timer-cfg" data-field="rounds" data-idx="${WorkoutsPage._state.builderExercises.indexOf(ex)}" placeholder="Rondas/Cap(m)" value="${ex.timer_config?.rounds || ''}" style="font-size:11px; padding:4px;" type="number">
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
  }).join('');
};

// ── LIBRARY TAB ───────────────────────────────────────────
WorkoutsPage.libraryContent = () => {
  const categories = [...new Set(WorkoutsPage._state.exercises.map(e => e.category))].filter(Boolean);
  let html = `
    <div class="flex items-center justify-between mb-4">
      <div class="flex gap-3 flex-1">${UI.searchBar('Buscar ejercicio...', 'ex-main-search')}</div>
      <button class="btn btn-primary" id="add-new-ex-btn">+ Crear Ejercicio</button>
    </div>
    
    <!-- Modals for create exercise -->
    <div id="new-ex-form" class="card mb-4" style="display:none; border: 1px solid var(--accent)">
      <div class="card-header"><div class="card-title">Nuevo Ejercicio en Catálogo</div></div>
      <div class="grid-2 gap-3 mb-3">
        ${UI.formGroup('Nombre', UI.input({ id: 'new-ex-name' }))}
        ${UI.formGroup('Categoría', UI.input({ id: 'new-ex-cat', placeholder: 'Ej: Funcional, Bodybuilding...' }))}
          ${UI.formGroup('Equipamiento', UI.input({ id: 'new-ex-eq' }))}
          ${UI.formGroup('Video URL (opcional)', UI.input({ id: 'new-ex-vid' }))}
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm" id="save-new-ex-btn">Guardar</button>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('new-ex-form').style.display='none'">Cancelar</button>
        </div>
      </div>

    ${UI.tabs(['Todos', ...categories], 0, 'ex-cat-tabs')}
    <div class="mt-4 grid-auto" id="exercise-main-library">
      ${WorkoutsPage._renderLibraryGrid('', 'Todos')}
    </div>
    `;
  return html;
};

WorkoutsPage._renderLibraryGrid = (query, category) => {
  let filtered = WorkoutsPage._state.exercises;
  if (query) filtered = filtered.filter(e => e.name.toLowerCase().includes(query.toLowerCase()));
  if (category && category !== 'Todos') filtered = filtered.filter(e => e.category === category);

  if (filtered.length === 0) return '<div class="text-muted col-span-full py-4 text-center">No hay ejercicios.</div>';

  return filtered.map(ex => `
      <div class="card flex flex-col justify-between">
        <div>
          <div class="font-bold" style="font-size: 16px; color: var(--accent)">${ex.name}</div>
          <div class="text-xs text-muted mt-1">Categoría: ${ex.category || '—'}</div>
          <div class="text-xs text-muted">Equipo: ${ex.equipment || '—'}</div>
        </div>
            ${ex.video_url ? `<a href="${ex.video_url}" target="_blank" class="text-xs mt-3 text-info" style="text-decoration:underline">Ver Video</a>` : ''}
        </div>
      `).join('');
};

// ── TEMPLATES TAB ─────────────────────────────────────────
WorkoutsPage.templatesContent = () => {
  if (WorkoutsPage._state.routines.length === 0) {
    return `<div class="card text-center py-5 text-muted">No hay plantillas creadas. Usa el Constructor para crear la primera.</div>`;
  }

  const cards = WorkoutsPage._state.routines.map(r => `
      <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title text-accent" style="font-size:18px;">${r.name}</div>
          <div class="flex gap-2 mt-1">${UI.badge(r.discipline || 'General', 'gym')} ${UI.levelBadge(r.level || 'beginner')}</div>
        </div>
        <div class="text-muted text-xs text-right">
            ${new Date(r.created_at).toLocaleDateString()}
        </div>
      </div>
      <p class="text-sm text-muted mt-3"><strong>Objetivo:</strong> ${r.goal || '—'}</p>
      <div class="divider mt-3 mb-3"></div>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm flex-1 view-template-btn" data-id="${r.id}">👁️ Ver Detalle</button>
      </div>
    </div>
      `).join('');

  return `
      <div class="grid-auto">${cards}</div>
        `;
};

// ── EVENTS ────────────────────────────────────────────────
WorkoutsPage.bindEvents = (user) => {

  // Tab switching
  document.addEventListener('tab-change', function handler(e) {
    if (e.detail.id === 'wod-tabs') {
      const container = document.getElementById('wod-tab-content');
      if (e.detail.idx === 0) {
        container.innerHTML = WorkoutsPage.builderContent();
        WorkoutsPage.renderBuilderExercises();
      } else if (e.detail.idx === 1) {
        container.innerHTML = WorkoutsPage.libraryContent();
      } else if (e.detail.idx === 2) {
        container.innerHTML = WorkoutsPage.templatesContent();
      }
    }
  });

  // Delegated events for dynamic content
  document.getElementById('workouts-container')?.addEventListener('click', async (e) => {
    // Change Day in Builder
    if (e.target.id === 'builder-day-select' || e.target.closest('#builder-day-select')) {
      e.target.addEventListener('change', (ev) => {
        WorkoutsPage._state.currentDay = ev.target.value;

        // Update the "Add buttons" text in library
        document.querySelectorAll('.add-ex-to-day-btn').forEach(b => {
          b.textContent = '+ Al ' + WorkoutsPage._state.currentDay;
        });

        WorkoutsPage.renderBuilderExercises();
      }, { once: true });
    }

    // Add exercise to builder day
    if (e.target.classList.contains('add-ex-to-day-btn')) {
      const exId = e.target.dataset.exid;
      WorkoutsPage._state.builderExercises.push({
        day_name: WorkoutsPage._state.currentDay,
        exercise_id: exId,
        sets: '', reps: '', rest: '', notes: ''
      });
      UI.toast(`Añadido al ${WorkoutsPage._state.currentDay} `, 'success');
      WorkoutsPage.renderBuilderExercises();
    }

    // Remove from builder
    if (e.target.classList.contains('remove-ex-btn')) {
      const idx = parseInt(e.target.dataset.idx);
      WorkoutsPage._state.builderExercises.splice(idx, 1);
      WorkoutsPage.renderBuilderExercises();
    }

    // Save Master Template
    if (e.target.closest('#save-workout-btn')) {
      const name = document.getElementById('wod-name').value.trim();
      if (!name) return UI.toast('El nombre es obligatorio', 'error');
      if (WorkoutsPage._state.builderExercises.length === 0) return UI.toast('Añade al menos un ejercicio', 'error');

      const goalEl = document.getElementById('wod-goal');
      const discEl = document.getElementById('wod-disc') || document.querySelector('[name="wod-disc"]');
      const levelEl = document.getElementById('wod-level') || document.querySelector('[name="wod-level"]');

      const payload = {
        name,
        goal: goalEl ? goalEl.value : '',
        discipline: discEl ? discEl.value : '',
        level: levelEl ? levelEl.value : '',
        authorId: user.id,
        exercises: WorkoutsPage._state.builderExercises
      };

      const btn = e.target;
      btn.disabled = true; btn.textContent = 'Guardando...';
      try {
        await _apiFetch('/api/routines', { method: 'POST', body: JSON.stringify(payload) });
        UI.toast('✅ Plantilla guardada exitosamente', 'success');
        // Reload component
        WorkoutsPage.render(user);
      } catch (err) {
        UI.toast(err.message, 'error');
        btn.disabled = false; btn.textContent = '💾 Guardar Plantilla';
      }
    }

    // Show New Ex Form
    if (e.target.id === 'add-new-ex-btn') {
      document.getElementById('new-ex-form').style.display = 'block';
    }

    // Save New Ex
    if (e.target.id === 'save-new-ex-btn') {
      const name = document.getElementById('new-ex-name').value.trim();
      if (!name) return UI.toast('Nombre obligatorio', 'error');

      const payload = {
        name,
        category: document.getElementById('new-ex-cat').value,
        equipment: document.getElementById('new-ex-eq').value,
        video_url: document.getElementById('new-ex-vid').value
      };

      try {
        await _apiFetch('/api/exercises', { method: 'POST', body: JSON.stringify(payload) });
        UI.toast('✅ Ejercicio creado', 'success');
        WorkoutsPage.render(user); // Reload everything
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    }

    // View Template Modal
    if (e.target.classList.contains('view-template-btn')) {
      const id = e.target.dataset.id;
      try {
        const rtn = await _apiFetch(`/ api / routines / ${id} `);

        // Group by day for simple viewing
        const byDay = {};
        rtn.exercises.forEach(ex => {
          if (!byDay[ex.day_name]) byDay[ex.day_name] = [];
          byDay[ex.day_name].push(ex);
        });

        let html = `< div style = "max-height:60vh; overflow-y:auto; padding-right:10px;" > `;
        for (let d in byDay) {
          html += `< h4 style = "margin-top:15px; border-bottom:1px solid var(--border); padding-bottom:5px; color:var(--accent)" > ${d}</h4 > `;
          byDay[d].forEach(ex => {
            html += `
      < div class="mb-2 p-2" style = "background:var(--bg-input); border-radius:6px; font-size:13px;" >
                                <strong>${ex.exercise_name}</strong><br>
                                <span class="text-muted">Sets: ${ex.sets || '-'} | Reps: ${ex.reps || '-'} | Descanso: ${ex.rest || '-'} | ${ex.notes || ''}</span>
                            </div>
    `;
          });
        }
        html += `</div > `;

        UI.modal(`Ver Plantilla: ${rtn.name} `, html);
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    }
  });

  // Builder Inputs updater
  document.getElementById('workouts-container')?.addEventListener('input', (e) => {
    if (e.target.classList.contains('b-ex-input')) {
      const idx = parseInt(e.target.dataset.idx);
      const field = e.target.dataset.field;
      if (WorkoutsPage._state.builderExercises[idx]) {
        WorkoutsPage._state.builderExercises[idx][field] = e.target.value;
      }
    }

    if (e.target.classList.contains('b-ex-timer-type')) {
      const idx = parseInt(e.target.dataset.idx);
      if (WorkoutsPage._state.builderExercises[idx]) {
        WorkoutsPage._state.builderExercises[idx].timer_type = e.target.value;
        if (!WorkoutsPage._state.builderExercises[idx].timer_config) {
          WorkoutsPage._state.builderExercises[idx].timer_config = {};
        }
        WorkoutsPage.renderBuilderExercises();
      }
    }

    if (e.target.classList.contains('b-ex-timer-cfg')) {
      const idx = parseInt(e.target.dataset.idx);
      const field = e.target.dataset.field;
      if (WorkoutsPage._state.builderExercises[idx]) {
        if (!WorkoutsPage._state.builderExercises[idx].timer_config) {
          WorkoutsPage._state.builderExercises[idx].timer_config = {};
        }
        const val = e.target.value;
        if (field === 'work' || field === 'rest') {
          WorkoutsPage._state.builderExercises[idx].timer_config[field] = UI.parseTimeToSeconds(val);
        } else {
          WorkoutsPage._state.builderExercises[idx].timer_config[field] = parseInt(val) || 0;
        }
      }
    }

    if (e.target.id === 'builder-search-ex') {
      document.getElementById('builder-lib-list').innerHTML = WorkoutsPage._renderBuilderLibraryList(e.target.value);
    }

    if (e.target.id === 'ex-main-search' || e.target.closest('#ex-cat-tabs')) {
      const q = document.getElementById('ex-main-search')?.value || '';
      const activeTab = document.querySelector('#ex-cat-tabs .active')?.textContent || 'Todos';
      document.getElementById('exercise-main-library').innerHTML = WorkoutsPage._renderLibraryGrid(q, activeTab);
    }
  });
};
