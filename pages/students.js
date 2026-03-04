// ============================================================
// Students Page — Full CRUD + Profile with 9 tabs
// ============================================================

window.StudentsPage = {};

const _API = 'http://localhost:5000';
async function _apiFetch(path, opts = {}) {
  const res = await fetch(_API + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la API');
  return data;
}

// ── LIST ───────────────────────────────────────────────────
StudentsPage.render = async (user) => {
  Layout.render({
    page: 'students', title: 'Estudiantes', role: user.role, user,
    content: `<div id="students-container" style="padding:20px;text-align:center">
          <span class="animate-spin" style="font-size:32px">⚡</span><br><br>Cargando estudiantes...
        </div>`
  });
  try {
    const params = new URLSearchParams();
    if (user.gymId) params.set('gymId', user.gymId);
    if (user.role === 'coach') params.set('coachId', user.id);

    const [students, coaches, gyms] = await Promise.all([
      _apiFetch('/api/students?' + params.toString()),
      _apiFetch('/api/coaches' + (user.gymId ? `?gymId=${user.gymId}` : '')),
      _apiFetch('/api/gyms'),
    ]);

    document.getElementById('students-container').outerHTML =
      `<div id="students-container">${StudentsPage.listContent(students, coaches, user)}</div>`;
    StudentsPage.bindListEvents(students, coaches, gyms, user);
  } catch (e) {
    document.getElementById('students-container').innerHTML =
      `<div class="card" style="color:var(--danger)">${e.message}</div>`;
  }
};

StudentsPage.listContent = (students, coaches, user) => {
  const cards = students.length === 0
    ? UI.emptyState('🏃', 'Sin estudiantes', 'Agrega el primer estudiante del gym.')
    : `<div class="grid-auto" id="students-list">${students.map(s => StudentsPage.studentCard(s)).join('')}</div>`;

  return `
    ${UI.pageHeader('🏃 Estudiantes', `${students.length} estudiante(s)`,
    `<button class="btn btn-primary btn-sm" id="add-student-btn">+ Nuevo Estudiante</button>`)}
    <div class="flex gap-3 mb-4 flex-wrap">
      ${UI.searchBar('Buscar estudiante...', 'students-search')}
      <select class="input" id="students-filter-level" style="width:auto">
        <option value="">Todos los niveles</option>
        <option value="beginner">Principiante</option>
        <option value="intermediate">Intermedio</option>
        <option value="advanced">Avanzado</option>
        <option value="elite">Elite</option>
      </select>
    </div>
    ${cards}`;
};

StudentsPage.studentCard = (s) => {
  const name = s.name || s.email || 'Sin nombre';
  const email = s.email || s.user_id || '';
  const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  const isInactive = s.status === 'inactive';
  const statusBadge = isInactive
    ? `<span style="background:rgba(239,68,68,.15);color:#f87171;padding:2px 8px;border-radius:12px;font-size:11px">⛔ Inactivo</span>`
    : `<span style="background:rgba(34,197,94,.15);color:#4ade80;padding:2px 8px;border-radius:12px;font-size:11px">✅ Activo</span>`;
  const avatarHtml = s.photo_url
    ? `<div style="width:48px;height:48px;border-radius:50%;overflow:hidden;flex-shrink:0;"><img src="${s.photo_url}" alt="Foto" style="width:100%;height:100%;object-fit:cover;"></div>`
    : UI.avatar(s.avatar || initials, s.avatar_color || 'av-green', 48);
  return `
  <div class="student-card ${isInactive ? 'opacity-60' : ''}" data-student-id="${s.id}">
    <div class="flex items-center gap-3 mb-3">
      ${avatarHtml}
      <div>
        <div class="student-name">${name}</div>
        <div class="flex gap-2 mt-1">${UI.levelBadge(s.level || 'beginner')} ${statusBadge}</div>
      </div>
    </div>
    <div class="text-xs text-muted mb-2">${email}</div>
    <div class="text-xs text-muted mb-3">
      🎽 <strong>${s.coach_name || '— Sin coach asignado'}</strong>
    </div>
    <div class="flex gap-2">
      <button class="btn btn-primary btn-sm flex-1" data-view-student="${s.id}" data-tab="0">👁️ Ver Perfil</button>
      <button class="btn btn-secondary btn-sm" data-view-student="${s.id}" data-tab="7" title="Editar">✏️</button>
      <button class="btn btn-sm student-toggle-btn" data-id="${s.id}" data-status="${s.status || 'active'}" style="background:${isInactive ? 'rgba(34,197,94,.15);color:#4ade80' : 'rgba(251,191,36,.15);color:#fbbf24'}" title="${isInactive ? 'Activar' : 'Desactivar'}">${isInactive ? '▶' : '⏸'}</button>
      <button class="btn btn-sm student-delete-btn" data-id="${s.id}" style="background:rgba(239,68,68,.15);color:#f87171" title="Eliminar">🗑️</button>
    </div>
  </div>`;
};

// ── LIST EVENTS ────────────────────────────────────────────
StudentsPage.bindListEvents = (students, coaches, gyms, user) => {
  document.getElementById('students-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#students-list .student-card').forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
  document.getElementById('students-filter-level')?.addEventListener('change', e => {
    const lvl = e.target.value;
    document.querySelectorAll('#students-list .student-card').forEach(card => {
      const s = students.find(x => x.id === card.dataset.studentId);
      card.style.display = !lvl || s?.level === lvl ? '' : 'none';
    });
  });

  document.getElementById('add-student-btn')?.addEventListener('click', () =>
    StudentsPage.showModal(null, coaches, gyms, user));

  document.querySelectorAll('[data-view-student]').forEach(btn =>
    btn.addEventListener('click', () =>
      StudentsPage.renderProfile(btn.dataset.viewStudent, user, parseInt(btn.dataset.tab) || 0)));

  document.querySelectorAll('.student-card').forEach(card =>
    card.addEventListener('dblclick', () =>
      StudentsPage.renderProfile(card.dataset.studentId, user, 0)));

  document.querySelectorAll('.student-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      try {
        const result = await _apiFetch(`/api/students/${id}/toggle-active`, { method: 'PATCH' });
        const label = result.status === 'inactive' ? 'Desactivado' : 'Activado';
        UI.toast(`✅ Estudiante ${label}`, 'success');
        StudentsPage.render(user);
      } catch (ex) { UI.toast(ex.message, 'error'); }
    });
  });

  document.querySelectorAll('.student-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este estudiante? También se borrará su cuenta de usuario.')) return;
      try {
        await _apiFetch(`/api/students/${btn.dataset.id}`, { method: 'DELETE' });
        UI.toast('Estudiante eliminado', 'success');
        StudentsPage.render(user);
      } catch (e) { UI.toast(e.message, 'error'); }
    });
  });
};

// ── CREATE MODAL ───────────────────────────────────────────
StudentsPage.showModal = (student, coaches, gyms, user) => {
  const isEdit = !!student;
  const coachOptions = coaches.map(c =>
    `<option value="${c.id}" ${student?.coach_id === c.id ? 'selected' : ''}>${c.name}</option>`
  ).join('');
  const levelOptions = ['beginner', 'intermediate', 'advanced', 'elite'].map(l =>
    `<option value="${l}" ${(student?.level || 'beginner') === l ? 'selected' : ''}>${['Principiante', 'Intermedio', 'Avanzado', 'Elite'][['beginner', 'intermediate', 'advanced', 'elite'].indexOf(l)]
    }</option>`
  ).join('');
  const needsGymSelect = !user.gymId;
  const gymOptions = (gyms || []).map(g =>
    `<option value="${g.id}" ${student?.gym_id === g.id ? 'selected' : ''}>${g.name}</option>`
  ).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card" style="max-width:520px;max-height:90vh;overflow-y:auto">
      <div class="modal-header">
        <div class="modal-title">${isEdit ? '✏️ Editar Estudiante' : '🏃 Nuevo Estudiante'}</div>
        <button class="btn btn-secondary btn-sm" id="modal-close-btn">✕</button>
      </div>
      <div class="flex flex-col gap-3 mt-4">
        ${UI.formGroup('Nombre completo *', UI.input({ id: 'st-name', value: student?.name || '', placeholder: 'Ana García' }))}
        ${UI.formGroup('Usuario o Correo *', isEdit
    ? `<input class="form-input" id="st-email" type="text" value="${student.email || ''}" disabled style="opacity:.5;cursor:not-allowed" />`
    : `<input class="form-input" id="st-email" type="text" placeholder="ana@correo.com o usuario_ana" />`)}
        ${isEdit ? '' : UI.formGroup('Contraseña *', UI.input({ id: 'st-pass', type: 'password', placeholder: '••••••••' }))}
        ${UI.formGroup('Nivel', `<select class="input" id="st-level">${levelOptions}</select>`)}
        ${needsGymSelect ? UI.formGroup('Gimnasio *', `
          <select class="input" id="st-gym">
            <option value="">— Seleccionar gimnasio —</option>
            ${gymOptions}
          </select>`) : ''}
        ${UI.formGroup('Coach asignado', `
          <select class="input" id="st-coach">
            <option value="">— Sin coach —</option>
            ${coachOptions}
          </select>`)}
      </div>
      <div class="flex gap-3 mt-5">
        <button class="btn btn-primary flex-1" id="st-save-btn">
          ${isEdit ? '💾 Guardar cambios' : '➕ Crear Estudiante'}
        </button>
        <button class="btn btn-secondary" id="modal-cancel-btn">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById('modal-close-btn').addEventListener('click', close);
  document.getElementById('modal-cancel-btn').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  document.getElementById('st-save-btn').addEventListener('click', async () => {
    const name = document.getElementById('st-name').value.trim();
    const email = document.getElementById('st-email').value.trim();
    const password = document.getElementById('st-pass')?.value;
    const level = document.getElementById('st-level').value;
    const coachId = document.getElementById('st-coach').value;

    if (!name || !email) { UI.toast('Nombre y usuario/correo son obligatorios', 'error'); return; }
    if (!isEdit && !password) { UI.toast('La contraseña es obligatoria', 'error'); return; }

    const btn = document.getElementById('st-save-btn');
    btn.disabled = true; btn.textContent = 'Guardando...';
    try {
      if (isEdit) {
        await _apiFetch(`/api/students/${student.id}`, {
          method: 'PUT',
          body: JSON.stringify({ level, coachId: coachId || null })
        });
        UI.toast('Estudiante actualizado', 'success');
      } else {
        const gymId = user.gymId || document.getElementById('st-gym')?.value || '';
        if (!gymId) { UI.toast('Selecciona un gimnasio', 'error'); btn.disabled = false; btn.textContent = '➕ Crear Estudiante'; return; }
        await _apiFetch('/api/students', {
          method: 'POST',
          body: JSON.stringify({ name, email, password, gymId, coachId: coachId || null, level })
        });
        UI.toast(`Estudiante ${name} creado`, 'success');
      }
      close();
      StudentsPage.render(user);
    } catch (e) {
      UI.toast(e.message, 'error');
      btn.disabled = false;
      btn.textContent = isEdit ? '💾 Guardar cambios' : '➕ Crear Estudiante';
    }
  });
};

// ── PROFILE ────────────────────────────────────────────────
StudentsPage.renderProfile = async (studentId, user, startTab = 0) => {
  try {
    const [s, coaches, plannings] = await Promise.all([
      _apiFetch(`/api/students/${studentId}`),
      _apiFetch('/api/coaches' + (user.gymId ? `?gymId=${user.gymId}` : '')),
      _apiFetch(`/api/plannings?studentId=${studentId}`),
    ]);
    StudentsPage._showProfile(s, coaches, plannings, user, parseInt(startTab));
  } catch (e) {
    UI.toast('No se pudo cargar el perfil: ' + e.message, 'error');
  }
};

StudentsPage._showProfile = (s, coaches, plannings, user, startTab = 0) => {
  const isStudent = user.role === 'student';
  const name = s.name || s.email || 'Sin nombre';
  const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

  if (isStudent) {
    const currentPhoto = s.photo_url || '';
    const content = `
    <div class="flex items-center gap-4 mb-6">
      <div class="relative group" style="cursor:pointer" id="avatar-upload-trigger">
        <div id="profile-main-avatar" style="width:72px;height:72px;border-radius:50%;overflow:hidden;border:3px solid var(--border);background:var(--bg-input);display:flex;align-items:center;justify-content:center;font-size:28px;">
          ${currentPhoto
        ? `<img src="${currentPhoto}" alt="Foto" style="width:100%;height:100%;object-fit:cover;">`
        : UI.avatar(s.avatar || initials, s.avatar_color || 'av-green', 72)}
        </div>
        <div class="absolute inset-0 bg-black opacity-0 group-hover:opacity-50 flex flex-col items-center justify-center rounded-full transition" style="color:white;font-size:12px;text-align:center;">
            📷
        </div>
      </div>
      <input type="file" id="avatar-file-input" accept="image/*" style="display:none;">
      <div>
        <h1 class="page-title" style="font-size:24px">${name}</h1>
        <div class="flex gap-2 mt-1">${UI.levelBadge(s.level || 'beginner')}</div>
        <div class="text-xs text-muted mt-1">🎽 Coach: ${s.coach_name || '—'}</div>
      </div>
    </div>
    <div class="stats-grid mb-6">
      ${UI.statCard({ label: 'Estado', value: s.status || 'Activo', icon: '✅', color: 'green' })}
      ${UI.statCard({ label: 'Nivel', value: s.level || '—', icon: '🏆', color: 'purple' })}
      ${UI.statCard({ label: 'Gimnasio', value: s.gym_name || '—', icon: '🏢', color: 'blue' })}
    </div>
    
    <!-- Mi Planificación (Read-Only) -->
    <div class="card mb-6">
      <div class="card-header"><div class="card-title">🏋️ Mi Plan de Entrenamiento</div></div>
      <div id="read-only-plan-container" class="mt-4">
         <span class="animate-spin text-xl">⚡</span> Cargando...
      </div>
    </div>
    
    <div class="card">
      <div class="card-header"><div class="card-title">👤 Mi Información Básica</div></div>
      <div class="form-grid form-grid-2">
        ${UI.formGroup('Nombre completo', UI.input({ value: name, id: 'pf-name', disabled: true }))}
        ${UI.formGroup('Usuario o Correo', UI.input({ type: 'text', value: s.email || '', id: 'pf-email', disabled: true }))}
      </div>
      <div class="text-xs text-muted mt-4">Para cambiar tus datos médicos o deportivos, contacta a tu entrenador.</div>
    </div>`;

    Layout.render({ page: 'my-profile', title: 'Mi Perfil', role: user.role, user, content });

    // Avatar click opens hidden file input
    document.getElementById('avatar-upload-trigger')?.addEventListener('click', () => {
      document.getElementById('avatar-file-input')?.click();
    });

    // File selected → upload
    document.getElementById('avatar-file-input')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { UI.toast('Imagen demasiado grande (máx 5MB)', 'error'); return; }
      UI.toast('⏳ Subiendo foto...', 'info');
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        try {
          await _apiFetch(`/api/users/${user.id}/photo`, {
            method: 'PATCH',
            body: JSON.stringify({ photoDataUrl: dataUrl })
          });
          // Update preview immediately
          const avatarEl = document.getElementById('profile-main-avatar');
          if (avatarEl) avatarEl.innerHTML = `<img src="${dataUrl}" alt="Foto" style="width:100%;height:100%;object-fit:cover;">`;
          // Persist in session
          const stored = JSON.parse(localStorage.getItem('fitpro_user') || '{}');
          stored.photoUrl = dataUrl;
          localStorage.setItem('fitpro_user', JSON.stringify(stored));
          UI.toast('✅ Foto actualizada', 'success');
        } catch (ex) { UI.toast('Error: ' + ex.message, 'error'); }
      };
      reader.readAsDataURL(file);
    });

    // Fetch and render read-only planning
    _apiFetch(`/api/student-routines/${s.id}`).then(plans => {
      const container = document.getElementById('read-only-plan-container');
      if (!plans || plans.length === 0) {
        container.innerHTML = `<div class="text-muted py-4">Aún no tienes un plan asignado.</div>`;
        return;
      }

      let html = '';
      plans.forEach((plan, planIndex) => {
        const isLatest = planIndex === 0;
        const byDay = {};
        plan.exercises.forEach(ex => {
          if (!byDay[ex.day_name]) byDay[ex.day_name] = [];
          byDay[ex.day_name].push(ex);
        });

        let daysHtml = '';
        for (let d in byDay) {
          daysHtml += `
                    <div class="mb-4 pl-3" style="border-left: 2px solid var(--border);">
                        <h4 style="margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:4px; color:var(--accent); font-weight:bold;">${d}</h4>
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
              let timerBtn = '';
              if (ex.timer_type && !ex.completed) {
                const tcfg = typeof ex.timer_config === 'string' ? ex.timer_config : JSON.stringify(ex.timer_config || {});
                timerBtn = `<button class="btn btn-sm btn-primary launch-smartwod-btn" data-type="${ex.timer_type}" data-cfg='${tcfg}' title="Iniciar Timer">▶️ Timer</button>`;
              }

              daysHtml += `
                          <div class="exercise-card relative flex justify-between items-center transition" style="background:var(--bg-input); ${ex.completed ? 'opacity: 0.6; filter: grayscale(1);' : ''}">
                              <div class="flex-1">
                                  <div class="font-bold text-sm mb-1 ${ex.completed ? 'line-through text-muted' : ''}">${ex.exercise_name} 
                                  </div>
                                  <div class="text-xs text-muted mb-1">
                                      <span class="badge badge-info">${ex.sets}</span> 
                                      <span class="badge badge-neutral">${ex.reps}</span> 
                                      <span class="ml-2">⏱️ ${ex.rest || '—'}</span>
                                  </div>
                                  ${ex.notes ? `<div class="mt-2 text-xs italic opacity-75">📝 Coach notas: ${ex.notes}</div>` : ''}
                                  <div class="flex gap-2 mt-2">
                                      ${timerBtn}
                                      <button class="btn btn-sm ${ex.completed ? 'btn-secondary' : 'btn-success'} profile-toggle-complete-btn" data-id="${ex.id}" data-st="${ex.completed ? 1 : 0}">
                                          ${ex.completed ? '↺ Desmarcar' : '✅ Completar'}
                                      </button>
                                  </div>
                              </div>
                          </div>
                      `;
            });
          }
          daysHtml += `</div></div>`;
        }

        html += `
            <div class="card mt-4 ${isLatest ? 'border-accent' : ''}" style="${isLatest ? 'border: 1px solid var(--accent);' : 'opacity: 0.85;'}">
                <div class="card-header w-full flex justify-between cursor-pointer collapse-btn" onclick="const el=document.getElementById('ro-plan-${plan.id}'); const isHide=el.style.display==='none'; el.style.display=isHide?'block':'none';">
                    <div class="card-title text-accent">📅 ${plan.name}</div>
                    <span class="text-xs text-muted mt-1">
                        ${isLatest ? `<span class="badge badge-success mr-2">Actual</span>` : ''} 
                        ▼
                    </span>
                </div>
                <div class="mt-4 plan-body" id="ro-plan-${plan.id}" style="display: ${isLatest ? 'block' : 'none'};">
                    ${daysHtml}
                </div>
            </div>`;
      });
      container.innerHTML = html;

      // Bind events for completion in profile
      container.addEventListener('click', async (e) => {
        if (e.target.closest('.profile-toggle-complete-btn')) {
          const btn = e.target.closest('.profile-toggle-complete-btn');
          const id = btn.dataset.id;
          const completed = btn.dataset.st === '0';

          btn.disabled = true;
          try {
            await _apiFetch(`/api/student-routine-exercises/${id}/complete`, {
              method: 'PUT',
              body: JSON.stringify({ completed })
            });
            // Re-render profile plans
            StudentsPage.renderProfile(s.id, user);
          } catch (err) {
            UI.toast('Error: ' + err.message, 'error');
            btn.disabled = false;
          }
        }
      });

    }).catch(e => {
      document.getElementById('read-only-plan-container').innerHTML = `<div class="text-danger">Error: ${e.message}</div>`;
    });

    return;
  }

  // ── Coach / Gym / Superadmin — 9 tabs ──
  const tabNames = ['👤 Personal', '🏥 Salud', '🏆 Deportivo', '📅 Disponib.', '🌙 Estilo', '❤️ Pref.', '📸 Fotos', '✏️ Editar', '📋 Planificación'];

  const coachOptions = coaches.map(c =>
    `<option value="${c.id}" ${s.coach_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
  const levelOptions = ['beginner', 'intermediate', 'advanced', 'elite'].map(l =>
    `<option value="${l}" ${s.level === l ? 'selected' : ''}>${['Principiante', 'Intermedio', 'Avanzado', 'Elite'][['beginner', 'intermediate', 'advanced', 'elite'].indexOf(l)]}</option>`
  ).join('');

  const tabContents = [
    StudentsPage.tabPersonal(s),
    StudentsPage.tabSalud(s),
    StudentsPage.tabDeportivo(s),
    StudentsPage.tabDisponibilidad(s),
    StudentsPage.tabEstiloVida(s),
    StudentsPage.tabPreferencias(s),
    StudentsPage.tabFotos(s),
    `<div class="card">
      <div class="card-header"><div class="card-title">✏️ Editar Estudiante</div></div>
      <div class="flex flex-col gap-4 mt-4">
        ${UI.formGroup('Nombre completo', UI.input({ id: 'edit-name', value: name }))}
        ${UI.formGroup('Usuario o Correo', UI.input({ type: 'text', id: 'edit-email', value: s.email || '' }))}
        ${UI.formGroup('Nueva contraseña', UI.input({ type: 'password', id: 'edit-password', placeholder: 'Dejar en blanco para no cambiar' }))}
        ${UI.formGroup('Estado', `
          <select class="input" id="edit-status">
            <option value="active" ${s.status === 'active' ? 'selected' : ''}>Activo</option>
            <option value="inactive" ${s.status === 'inactive' ? 'selected' : ''}>Inactivo</option>
          </select>`)}
        ${UI.formGroup('Nivel', `<select class="input" id="edit-level">${levelOptions}</select>`)}
        ${UI.formGroup('Coach asignado', `
          <select class="input" id="edit-coach">
            <option value="">— Sin coach —</option>
            ${coachOptions}
          </select>`)}
      </div>
      <div class="flex gap-3 mt-5">
        <button class="btn btn-primary" id="save-edit-btn">💾 Guardar cambios</button>
        <button class="btn btn-secondary" id="cancel-edit-btn">← Volver a la lista</button>
      </div>
    </div>`,
    StudentsPage.tabPlanificacion(s, plannings, user),
  ];

  const content = `
  <div class="flex items-center gap-3 mb-4" id="back-to-students" style="cursor:pointer">
    <button class="btn btn-secondary btn-sm">← Volver</button>
    <div>
      <h2 class="page-title" style="font-size:22px">${name}</h2>
      <div class="flex gap-2 mt-1">${UI.levelBadge(s.level || 'beginner')} ${UI.badge(s.gym_name || '—', 'gym')}</div>
    </div>
  </div>
  <div class="flex gap-4 flex-wrap mb-4">
    ${UI.avatar(s.avatar || initials, s.avatar_color || 'av-green', 64)}
    <div class="flex-1">
      <div class="text-sm text-muted">📧 ${s.email || '—'}</div>
      <div class="text-sm text-muted mt-1">🎽 Coach: <strong>${s.coach_name || '— Sin coach'}</strong></div>
      <div class="text-sm text-muted mt-1">🏋️ Estado: ${s.status || 'activo'}</div>
    </div>
  </div>
  <div class="profile-tabs-nav">
    ${tabNames.map((n, i) => `<div class="profile-tab-item ${i === startTab ? 'active' : ''}" data-profile-tab="${i}">${n}</div>`).join('')}
  </div>
  <div id="profile-tab-content">${tabContents[startTab] || tabContents[0]}</div>`;

  Layout.render({ page: 'students', title: 'Ficha de Estudiante', role: user.role, user, content });

  document.getElementById('back-to-students')?.addEventListener('click', () => StudentsPage.render(user));

  document.querySelectorAll('[data-profile-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-profile-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const idx = parseInt(tab.dataset.profileTab);
      document.getElementById('profile-tab-content').innerHTML = tabContents[idx] || '';
      StudentsPage._bindTabEvents(s, user, idx);
    });
  });

  StudentsPage._bindTabEvents(s, user, startTab);
};

StudentsPage._bindTabEvents = (s, user, idx) => {
  if (idx === 0) StudentsPage._bindPersonalEvents(s, user);
  if (idx === 1) StudentsPage._bindSaludEvents(s, user);
  if (idx === 2) StudentsPage._bindDeportivoEvents(s, user);
  if (idx === 3) StudentsPage._bindDisponibilidadEvents(s, user);
  if (idx === 4) StudentsPage._bindEstiloVidaEvents(s, user);
  if (idx === 5) StudentsPage._bindPreferenciasEvents(s, user);
  if (idx === 6) StudentsPage._bindFotosEvents(s); // 📷 Photo upload tab
  if (idx === 7) { // ✏️ Edit tab
    document.getElementById('save-edit-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('edit-name')?.value.trim();
      const email = document.getElementById('edit-email')?.value.trim();
      const password = document.getElementById('edit-password')?.value;
      const status = document.getElementById('edit-status')?.value;
      const level = document.getElementById('edit-level')?.value;
      const coachId = document.getElementById('edit-coach')?.value;

      const btn = document.getElementById('save-edit-btn');
      btn.disabled = true; btn.textContent = 'Guardando...';

      try {
        await _apiFetch(`/api/students/${s.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name, email, password: password || undefined,
            status, level, coachId: coachId || null,
            changedBy: user.id
          })
        });
        UI.toast('✅ Estudiante actualizado', 'success');
        StudentsPage.renderProfile(s.id, user, 7);
      } catch (e) {
        UI.toast(e.message, 'error');
        btn.disabled = false; btn.textContent = '💾 Guardar cambios';
      }
    });
    document.getElementById('cancel-edit-btn')?.addEventListener('click', () => StudentsPage.render(user));
  }
  if (idx === 8) { // 📋 Planning tab
    StudentsPage._bindPlanningEvents(s, user);
  }
};

StudentsPage._loadAuditLogs = async (studentId) => {
  try {
    const logs = await _apiFetch(`/api/audit-logs?entityType=student&entityId=${studentId}`);
    const container = document.getElementById('audit-logs-container');
    if (!container) return;

    if (logs.length === 0) {
      container.innerHTML = '<div class="text-sm text-muted">No hay historial de cambios aún.</div>';
      return;
    }

    container.innerHTML = logs.map(l => {
      const date = new Date(l.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      return `
        <div style="display:flex; gap:12px; margin-bottom:12px; border-left:2px solid var(--border); padding-left:16px; position:relative;">
          <div style="position:absolute; left:-6px; top:4px; width:10px; height:10px; border-radius:50%; background:var(--accent);"></div>
          <div>
            <div class="text-sm font-semibold">${l.user_name || 'Sistema'}</div>
            <div class="text-xs text-muted mb-1">${date}</div>
            <div class="text-sm">
              Cambió <strong>${l.field}</strong>
              <div style="background:var(--bg-input); padding:4px 8px; border-radius:4px; font-size:12px; margin-top:4px;">
                <span style="color:var(--danger); text-decoration:line-through;">${l.old_value || '(vacío)'}</span>
                <span style="margin:0 4px;">→</span>
                <span style="color:var(--success); font-weight:bold;">${l.new_value || '(vacío)'}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error('Error fetching logs', e);
  }
};

StudentsPage._bindGenericSave = (btnId, sId, user, tabIdx, buildPayload) => {
  document.getElementById(btnId)?.addEventListener('click', async () => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = true; btn.textContent = 'Guardando...';
    try {
      const payload = buildPayload();
      payload.changedBy = user.id;
      await _apiFetch(`/api/students/${sId}`, { method: 'PUT', body: JSON.stringify(payload) });
      UI.toast('✅ Datos guardados con éxito', 'success');
      StudentsPage.renderProfile(sId, user, tabIdx);
    } catch (e) {
      UI.toast(e.message, 'error');
      btn.disabled = false; btn.textContent = '💾 Guardar cambios';
    }
  });
};

StudentsPage._bindPersonalEvents = async (s, user) => {
  StudentsPage._bindGenericSave('save-personal-btn', s.id, user, 0, () => ({
    phone: document.getElementById('per-phone').value,
    dob: document.getElementById('per-dob').value,
    height: document.getElementById('per-height').value,
    weight: document.getElementById('per-weight').value,
    occupation: document.getElementById('per-occupation').value,
    address: document.getElementById('per-address').value
  }));
  StudentsPage._loadAuditLogs(s.id);
};

StudentsPage._bindSaludEvents = async (s, user) => {
  StudentsPage._bindGenericSave('save-salud-btn', s.id, user, 1, () => ({
    injuries: document.getElementById('sa-injuries').value,
    surgeries: document.getElementById('sa-surgeries').value,
    allergies: document.getElementById('sa-allergies').value,
    medications: document.getElementById('sa-medications').value,
    limitations: document.getElementById('sa-limitations').value
  }));
  StudentsPage._loadAuditLogs(s.id);
};

StudentsPage._bindDeportivoEvents = async (s, user) => {
  StudentsPage._bindGenericSave('save-deportivo-btn', s.id, user, 2, () => ({
    experience: document.getElementById('de-experience').value,
    sports: document.getElementById('de-sports').value,
    session_duration: document.getElementById('de-session-dur').value,
    weekly_frequency: document.getElementById('de-freq').value
  }));
  StudentsPage._loadAuditLogs(s.id);
};

StudentsPage._bindDisponibilidadEvents = async (s, user) => {
  StudentsPage._bindGenericSave('save-disponibilidad-btn', s.id, user, 3, () => {
    const checkedDays = Array.from(document.querySelectorAll('#di-days-container input:checked')).map(cb => cb.value);
    return {
      days: JSON.stringify(checkedDays),
      schedule: document.getElementById('di-schedule').value,
      location: document.getElementById('di-loc').value
    };
  });
  StudentsPage._loadAuditLogs(s.id);
};

StudentsPage._bindEstiloVidaEvents = async (s, user) => {
  StudentsPage._bindGenericSave('save-estilo-btn', s.id, user, 4, () => ({
    sleep_hours: document.getElementById('es-sleep').value,
    diet: document.getElementById('es-diet').value,
    alcohol: document.getElementById('es-alc').value,
    tobacco: document.getElementById('es-tob').value,
    daily_activity: document.getElementById('es-act').value
  }));
  StudentsPage._loadAuditLogs(s.id);
};

StudentsPage._bindPreferenciasEvents = async (s, user) => {
  StudentsPage._bindGenericSave('save-preferencias-btn', s.id, user, 5, () => ({
    fav_exercises: document.getElementById('pr-fav').value,
    disliked_exercises: document.getElementById('pr-dislike').value,
    music: document.getElementById('pr-music').value,
    coach_notes: document.getElementById('pr-notes').value
  }));
  StudentsPage._loadAuditLogs(s.id);
};

// ── PROFILE TABS ──────────────────────────────────────────
StudentsPage.tabPersonal = (s) => `
<div class="grid-auto" style="gap:20px; align-items:start;">
  <div class="card">
    <div class="card-header"><div class="card-title">📝 Datos Personales</div></div>
    <div class="form-grid form-grid-2 mt-4">
      ${UI.formGroup('Nombre completo', UI.input({ value: s.name || '', disabled: true, title: 'Editar en la pestaña Editar' }))}
      ${UI.formGroup('Usuario o Correo', UI.input({ type: 'text', value: s.email || '', disabled: true }))}
      ${UI.formGroup('Teléfono', UI.input({ id: 'per-phone', value: s.phone || '' }))}
      ${UI.formGroup('Fecha de nacimiento', UI.input({ id: 'per-dob', type: 'date', value: s.dob || '' }))}
      ${UI.formGroup('Altura (cm)', UI.input({ id: 'per-height', type: 'number', value: s.height || '' }))}
      ${UI.formGroup('Peso (kg)', UI.input({ id: 'per-weight', type: 'number', value: s.weight || '' }))}
      ${UI.formGroup('Ocupación', UI.input({ id: 'per-occupation', value: s.occupation || '' }))}
      ${UI.formGroup('Dirección', UI.input({ id: 'per-address', value: s.address || '' }))}
    </div>
    <div class="mt-4"><button class="btn btn-primary" id="save-personal-btn">💾 Guardar cambios</button></div>
  </div>
  
  <div class="card" style="position:sticky; top:20px;">
    <div class="card-header">
      <div class="card-title flex items-center gap-2">⏱️ Historial de Cambios <span class="badge badge-info" style="font-size:10px">Auditoría</span></div>
    </div>
    <div id="audit-logs-container" class="mt-4" style="max-height: 400px; overflow-y: auto;">
      <!-- Logs will be loaded here via JS -->
      <span class="animate-spin" style="font-size:16px;">⚡</span> Cargando historial...
    </div>
  </div>
</div>`;

const auditHtml = `
  <div class="card" style="position:sticky; top:20px; height:fit-content">
    <div class="card-header">
      <div class="card-title flex items-center gap-2">⏱️ Historial de Cambios <span class="badge badge-info" style="font-size:10px">Auditoría</span></div>
    </div>
    <div id="audit-logs-container" class="mt-4" style="max-height: 400px; overflow-y: auto;">
      <span class="animate-spin" style="font-size:16px;">⚡</span> Cargando historial...
    </div>
  </div>
`;

StudentsPage.tabSalud = (s) => `
<div class="grid-auto" style="gap:20px; align-items:start;">
  <div class="card">
    <div class="card-header"><div class="card-title">🏥 Salud y Médicos</div></div>
    <div class="flex flex-col gap-4 mt-4">
      ${UI.formGroup('Lesiones previas', UI.textarea({ id: 'sa-injuries', rows: 2, value: s.injuries || '' }))}
      ${UI.formGroup('Cirugías', UI.textarea({ id: 'sa-surgeries', rows: 2, value: s.surgeries || '' }))}
      ${UI.formGroup('Alergias', UI.input({ id: 'sa-allergies', value: s.allergies || '' }))}
      ${UI.formGroup('Medicación actual', UI.input({ id: 'sa-medications', value: s.medications || '' }))}
      ${UI.formGroup('Limitaciones para el entrenamiento', UI.textarea({ id: 'sa-limitations', rows: 3, value: s.limitations || '' }))}
      <button class="btn btn-primary" id="save-salud-btn">💾 Guardar cambios</button>
    </div>
  </div>
  ${auditHtml}
</div>`;

StudentsPage.tabDeportivo = (s) => `
<div class="grid-auto" style="gap:20px; align-items:start;">
  <div class="card">
    <div class="card-header"><div class="card-title">🏆 Perfil Deportivo</div></div>
    <div class="flex flex-col gap-4 mt-4">
      ${UI.formGroup('Años de experiencia', UI.input({ id: 'de-experience', value: s.experience || '' }))}
      ${UI.formGroup('Deportes previos', UI.textarea({ id: 'de-sports', rows: 2, value: s.sports || '' }))}
      ${UI.formGroup('Duración de sesión preferida', UI.input({ id: 'de-session-dur', value: s.session_duration || '', placeholder: 'Ej: 60 min' }))}
      ${UI.formGroup('Frecuencia semanal', UI.input({ id: 'de-freq', value: s.weekly_frequency || '', placeholder: 'Ej: 3 días/semana' }))}
      <button class="btn btn-primary" id="save-deportivo-btn">💾 Guardar cambios</button>
    </div>
  </div>
  ${auditHtml}
</div>`;

StudentsPage.tabDisponibilidad = (s) => {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const savedDays = s.days ? JSON.parse(s.days) : [];
  return `
<div class="grid-auto" style="gap:20px; align-items:start;">
  <div class="card">
    <div class="card-header"><div class="card-title">📅 Disponibilidad</div></div>
    <div class="flex flex-col gap-4 mt-4">
      <div class="form-group"><label class="form-label">Días disponibles</label>
        <div class="flex gap-2 flex-wrap" id="di-days-container">
          ${days.map(d => `<label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" value="${d}" ${savedDays.includes(d) ? 'checked' : ''} style="accent-color:var(--accent)"> ${d}</label>`).join('')}
        </div>
      </div>
      ${UI.formGroup('Horario preferido', UI.input({ id: 'di-schedule', value: s.schedule || '', placeholder: '07:00 - 08:30' }))}
      ${UI.formGroup('Lugar', UI.select('di-loc', ['Gimnasio', 'Casa', 'Mixto'], s.location || 'Gimnasio'))}
      <button class="btn btn-primary" id="save-disponibilidad-btn">💾 Guardar cambios</button>
    </div>
  </div>
  ${auditHtml}
</div>`;
};

StudentsPage.tabEstiloVida = (s) => `
<div class="grid-auto" style="gap:20px; align-items:start;">
  <div class="card">
    <div class="card-header"><div class="card-title">🌙 Estilo de Vida</div></div>
    <div class="form-grid form-grid-2 mt-4">
      ${UI.formGroup('Horas de sueño', UI.input({ id: 'es-sleep', type: 'number', step: '0.5', value: s.sleep_hours || '' }))}
      ${UI.formGroup('Calidad de dieta', UI.select('es-diet', ['Mala', 'Regular', 'Buena', 'Muy buena', 'Excelente'], s.diet || 'Regular'))}
      ${UI.formGroup('Consumo de alcohol', UI.select('es-alc', ['No', 'Ocasional', 'Frecuente', 'Nunca'], s.alcohol || 'Nunca'))}
      ${UI.formGroup('Tabaco', UI.select('es-tob', ['No', 'Sí', 'Exfumador'], s.tobacco || 'No'))}
      ${UI.formGroup('Nivel de actividad diaria', UI.select('es-act', ['Sedentario', 'Bajo-Moderado', 'Moderado', 'Alto', 'Muy alto'], s.daily_activity || 'Moderado'))}
      <div class="mt-4" style="grid-column:1/-1">
        <button class="btn btn-primary" id="save-estilo-btn">💾 Guardar cambios</button>
      </div>
    </div>
  </div>
  ${auditHtml}
</div>`;

StudentsPage.tabPreferencias = (s) => `
<div class="grid-auto" style="gap:20px; align-items:start;">
  <div class="card">
    <div class="card-header"><div class="card-title">❤️ Preferencias</div></div>
    <div class="flex flex-col gap-4 mt-4">
      ${UI.formGroup('Ejercicios favoritos', UI.textarea({ id: 'pr-fav', rows: 3, value: s.fav_exercises || '' }))}
      ${UI.formGroup('Ejercicios que no le gustan', UI.textarea({ id: 'pr-dislike', rows: 3, value: s.disliked_exercises || '' }))}
      ${UI.formGroup('Preferencia musical', UI.input({ id: 'pr-music', value: s.music || '' }))}
      ${UI.formGroup('Notas adicionales del coach', UI.textarea({ id: 'pr-notes', rows: 4, value: s.coach_notes || '' }))}
      <button class="btn btn-primary" id="save-preferencias-btn">💾 Guardar cambios</button>
    </div>
  </div>
  ${auditHtml}
</div>`;

StudentsPage.tabFotos = (s) => {
  const userId = s.user_id || s.userId || '';
  const currentPhoto = s.photo_url || '';
  return `
  <div class="card">
    <div class="card-header"><div class="card-title">🖼️ Foto de Perfil</div></div>
    <div class="flex items-center gap-6 mt-4 mb-6">
      <div id="profile-photo-preview" style="width:96px;height:96px;border-radius:50%;overflow:hidden;border:3px solid var(--border);flex-shrink:0;background:var(--bg-input);display:flex;align-items:center;justify-content:center;font-size:32px;">
        ${currentPhoto
      ? `<img src="${currentPhoto}" alt="Foto de perfil" style="width:100%;height:100%;object-fit:cover;">`
      : `<span style="opacity:.5">${(s.name || '?').slice(0, 2).toUpperCase()}</span>`}
      </div>
      <div class="flex flex-col gap-3">
        <label for="profile-photo-input" class="btn btn-primary" style="cursor:pointer;display:inline-flex;align-items:center;gap:8px;">
          📷 Seleccionar foto
        </label>
        <input type="file" id="profile-photo-input" accept="image/*" style="display:none;" data-user-id="${userId}">
        <div class="text-xs text-muted">JPG, PNG o WEBP · Máx 5MB</div>
        <div id="photo-upload-status" style="font-size:13px;min-height:20px;"></div>
      </div>
    </div>
  </div>`;
};

StudentsPage._bindFotosEvents = (s) => {
  const input = document.getElementById('profile-photo-input');
  if (!input) return;
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { UI.toast('Imagen demasiado grande (máx 5MB)', 'error'); return; }
    const status = document.getElementById('photo-upload-status');
    const preview = document.getElementById('profile-photo-preview');
    if (status) status.innerHTML = '<span style="color:var(--accent)">⏳ Subiendo...</span>';

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      try {
        const userId = input.dataset.userId || s.user_id;
        await _apiFetch(`/api/users/${userId}/photo`, {
          method: 'PATCH',
          body: JSON.stringify({ photoDataUrl: dataUrl })
        });
        if (preview) preview.innerHTML = `<img src="${dataUrl}" alt="Foto" style="width:100%;height:100%;object-fit:cover;">`;
        if (status) status.innerHTML = '<span style="color:var(--success)">✅ Foto actualizada</span>';
        UI.toast('✅ Foto de perfil actualizada', 'success');
      } catch (e) {
        if (status) status.innerHTML = `<span style="color:var(--danger)">❌ ${e.message}</span>`;
        UI.toast('Error subiendo foto: ' + e.message, 'error');
      }
    };
    reader.readAsDataURL(file);
  });
};

// ── PLANNING TAB ──────────────────────────────────────────
StudentsPage.tabPlanificacion = (s, plannings, user) => {
  const list = (plannings || []).length === 0
    ? UI.emptyState('📋', 'Sin planificaciones', 'Crea la primera sesión para este estudiante')
    : (plannings || []).map(p => `
      <div class="card" style="padding:12px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="font-semibold">${p.title || 'Sesión'}</div>
          <div class="text-xs text-muted mt-1">📅 ${p.date} · 
            <span style="color:${p.status === 'done' ? 'var(--success)' : p.status === 'progress' ? 'var(--warning)' : 'var(--text-muted)'}">
              ${p.status === 'done' ? '✅ Realizada' : p.status === 'progress' ? '🔄 En progreso' : '⏳ Pendiente'}
            </span>
          </div>
          ${p.notes ? `<div class="text-xs text-muted mt-1">📝 ${p.notes}</div>` : ''}
        </div>
        <div class="flex gap-2">
          ${p.status !== 'done' ? `<button class="btn btn-sm plan-done-btn" data-plan-id="${p.id}" style="background:rgba(34,197,94,.15);color:#4ade80">✅</button>` : ''}
          <button class="btn btn-sm plan-delete-btn" data-plan-id="${p.id}" style="background:rgba(239,68,68,.15);color:#f87171">🗑️</button>
        </div>
      </div>`).join('');

  return `
  <div class="card mb-4">
    <div class="card-header"><div class="card-title">➕ Nueva Sesión</div></div>
    <div class="flex flex-col gap-3 mt-3">
      ${UI.formGroup('Título de la sesión', UI.input({ id: 'plan-title', placeholder: 'Ej: Fuerza tren superior' }))}
      ${UI.formGroup('Fecha *', UI.input({ id: 'plan-date', type: 'date', value: new Date().toISOString().split('T')[0] }))}
      ${UI.formGroup('Notas', UI.textarea({ id: 'plan-notes', rows: 2, placeholder: 'Instrucciones, ejercicios...' }))}
    </div>
    <div class="mt-4">
      <button class="btn btn-primary" id="plan-save-btn">📋 Crear Sesión</button>
    </div>
  </div>
  <div id="plannings-list">${list}</div>`;
};

StudentsPage._bindPlanningEvents = (s, user) => {
  document.getElementById('plan-save-btn')?.addEventListener('click', async () => {
    const title = document.getElementById('plan-title')?.value.trim() || 'Sesión de entrenamiento';
    const date = document.getElementById('plan-date')?.value;
    const notes = document.getElementById('plan-notes')?.value.trim();
    if (!date) { UI.toast('Selecciona una fecha', 'error'); return; }
    const btn = document.getElementById('plan-save-btn');
    btn.disabled = true; btn.textContent = 'Guardando...';
    try {
      await _apiFetch('/api/plannings', {
        method: 'POST',
        body: JSON.stringify({ studentId: s.id, coachId: user.id || null, title, date, notes })
      });
      UI.toast('✅ Sesión creada', 'success');
      StudentsPage.renderProfile(s.id, user, 8);
    } catch (e) {
      UI.toast(e.message, 'error');
      btn.disabled = false; btn.textContent = '📋 Crear Sesión';
    }
  });

  document.querySelectorAll('.plan-done-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await _apiFetch(`/api/plannings/${btn.dataset.planId}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) });
      UI.toast('✅ Sesión marcada como realizada', 'success');
      StudentsPage.renderProfile(s.id, user, 8);
    });
  });

  document.querySelectorAll('.plan-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta sesión?')) return;
      await _apiFetch(`/api/plannings/${btn.dataset.planId}`, { method: 'DELETE' });
      UI.toast('Sesión eliminada', 'success');
      StudentsPage.renderProfile(s.id, user, 8);
    });
  });
};
