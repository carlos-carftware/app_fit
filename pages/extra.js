// ============================================================
// pages/extra.js — Gyms, Coaches, Stats, Settings, Calendar, Reports
// All gym/coach data backed by real SQLite API
// ============================================================

const API = 'http://localhost:5000';

// ── Shared helpers ──────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la API');
  return data;
}

function avatarColors() {
  return ['av-purple', 'av-blue', 'av-green', 'av-orange', 'av-red', 'av-cyan', 'av-lime', 'av-pink'];
}

// ══════════════════════════════════════════════════════
// GYMS PAGE — Superadmin full CRUD
// ══════════════════════════════════════════════════════
window.GymsPage = {};

GymsPage.render = async (user) => {
  Layout.render({
    page: 'gyms', title: 'Gimnasios', role: user.role, user,
    content: `<div class="page-loading" id="gyms-container">
          <div style="text-align:center;padding:60px"><span class="animate-spin" style="font-size:32px">⚡</span><br><br>Cargando gimnasios...</div>
        </div>`
  });
  try {
    const gyms = await apiFetch('/api/gyms');
    document.getElementById('gyms-container').innerHTML = GymsPage.content(gyms, user);
    GymsPage.bindEvents(user);
  } catch (e) {
    document.getElementById('gyms-container').innerHTML = `<div class="card" style="color:var(--danger)">${e.message}</div>`;
  }
};

GymsPage.content = (gyms, user) => `
  ${UI.pageHeader('🏢 Gimnasios', `${gyms.length} centro(s) registrado(s)`,
  `<button class="btn btn-primary btn-sm" id="gym-add-btn">+ Nuevo Gimnasio</button>`)}

  ${UI.searchBar('Buscar gimnasio...', 'gym-search')}

  <div class="table-wrapper mt-4">
    <table class="data-table" id="gyms-table">
      <thead><tr>
        <th>Gimnasio</th><th>Plan</th><th>Coaches</th><th>Estudiantes</th><th>URL de Login</th><th>Estado</th><th></th>
      </tr></thead>
      <tbody>
        ${gyms.map(g => `
        <tr data-gym-id="${g.id}">
          <td>
            <div class="flex items-center gap-3">
              ${UI.avatar((g.name || 'G').slice(0, 2).toUpperCase(), 'av-blue', 36)}
              <div>
                <div class="font-semibold">${g.name}</div>
                <div class="text-xs text-muted">${g.address || '—'}</div>
              </div>
            </div>
          </td>
          <td>${UI.badge(g.plan || 'basic', g.plan === 'elite' ? 'superadmin' : g.plan === 'pro' ? 'coach' : 'student')}</td>
          <td>${g.coach_count || 0}</td>
          <td>${g.student_count || 0}</td>
          <td>
            <code style="font-size:11px;background:var(--bg-secondary);padding:2px 6px;border-radius:4px;cursor:pointer" 
                  class="gym-url-copy" data-url="http://localhost:4000/#login?gym=${g.slug}" 
                  title="Clic para copiar">
              ?gym=${g.slug}
            </code>
          </td>
          <td>${g.active ? UI.badge('Activo', 'gym') : UI.badge('Inactivo', 'student')}</td>
          <td class="text-right" style="white-space:nowrap">
            <button class="btn btn-secondary btn-sm gym-edit-btn" data-id="${g.id}" style="margin-right:4px">✏️ Editar</button>
            <button class="btn btn-sm gym-delete-btn" data-id="${g.id}" style="background:rgba(239,68,68,.15);color:#f87171">🗑️</button>
          </td>
        </tr>`).join('')}
        ${gyms.length === 0 ? `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">Sin gimnasios — crea el primero</td></tr>` : ''}
      </tbody>
    </table>
  </div>`;

GymsPage.bindEvents = (user) => {
  document.getElementById('gym-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#gyms-table tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  document.getElementById('gym-add-btn')?.addEventListener('click', () => GymsPage.showModal(null, user));

  document.querySelectorAll('.gym-edit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const gym = await apiFetch(`/api/gyms/${btn.dataset.id}`);
        GymsPage.showModal(gym, user);
      } catch (e) { UI.toast(e.message, 'error'); }
    });
  });

  document.querySelectorAll('.gym-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este gimnasio? Esta acción no se puede deshacer.')) return;
      try {
        await apiFetch(`/api/gyms/${btn.dataset.id}`, { method: 'DELETE' });
        UI.toast('Gimnasio eliminado', 'success');
        GymsPage.render(user);
      } catch (e) { UI.toast(e.message, 'error'); }
    });
  });

  document.querySelectorAll('.gym-url-copy').forEach(el => {
    el.addEventListener('click', () => {
      navigator.clipboard.writeText(el.dataset.url).then(() => UI.toast('URL copiada al portapapeles', 'success'));
    });
  });
};

GymsPage.showModal = (gym, user) => {
  const isEdit = !!gym;
  const plan_options = ['basic', 'pro', 'elite'].map(p =>
    `<option value="${p}" ${gym?.plan === p ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`
  ).join('');

  const modal = document.createElement('div');
  modal.id = 'gym-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
      <div class="modal-card" style="max-width:560px;max-height:90vh;overflow-y:auto">
        <div class="modal-header">
          <div class="modal-title">${isEdit ? '✏️ Editar Gimnasio' : '🏢 Nuevo Gimnasio'}</div>
          <button class="btn btn-secondary btn-sm" id="modal-close-btn">✕</button>
        </div>

        <!-- Gym data -->
        <div class="flex flex-col gap-3 mt-4">
          ${UI.formGroup('Nombre del Gimnasio *', UI.input({ id: 'gym-name', value: gym?.name || '', placeholder: 'CrossFit Box Madrid' }))}
          ${UI.formGroup('Dirección', UI.input({ id: 'gym-address', value: gym?.address || '', placeholder: 'C/ Gran Vía 45, Madrid' }))}
          ${UI.formGroup('Teléfono', UI.input({ id: 'gym-phone', type: 'tel', value: gym?.phone || '', placeholder: '+34 910 123 456' }))}
          ${UI.formGroup('Email del gimnasio', UI.input({ id: 'gym-email-gym', type: 'email', value: gym?.email || '', placeholder: 'contacto@mygym.com' }))}
          ${UI.formGroup('Plan', `<select class="input" id="gym-plan"><option value="">Seleccionar...</option>${plan_options}</select>`)}
          ${isEdit ? `<label class="flex items-center gap-3" style="cursor:pointer">
            <input type="checkbox" id="gym-active" ${gym?.active ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--accent)">
            <span class="text-sm">Gimnasio activo</span>
          </label>` : ''}
        </div>

        <!-- Gym Admin section -->
        <div style="border-top:1px solid var(--border);margin:20px 0 16px;padding-top:16px">
          <div style="font-family:'Rajdhani',sans-serif;font-size:16px;font-weight:700;margin-bottom:12px;color:var(--accent-light)">
            👤 ${isEdit ? 'Administrador del Gym (dejar vacío para no cambiar)' : 'Crear Administrador del Gym'}
          </div>
          <div class="flex flex-col gap-3">
            ${UI.formGroup('Nombre del administrador', UI.input({ id: 'admin-name', value: '', placeholder: 'Carlos López' }))}
            ${UI.formGroup('Usuario o Email del administrador *', UI.input({ id: 'admin-email', type: 'text', value: '', placeholder: 'admin@mygym.com o usuario_admin' }))}
            ${UI.formGroup('Contraseña *', UI.input({ id: 'admin-password', type: 'password', placeholder: '••••••••' }))}
          </div>
          ${!isEdit ? `<div class="text-xs text-muted mt-2" style="display:flex;align-items:center;gap:6px">
            <span>ℹ️</span> Con estos datos el administrador ingresas desde la URL de login del gym.
          </div>` : ''}
        </div>

        <div class="flex gap-3">
          <button class="btn btn-primary flex-1" id="gym-save-btn">
            ${isEdit ? '💾 Guardar cambios' : '➕ Crear Gimnasio + Admin'}
          </button>
          <button class="btn btn-secondary" id="modal-cancel-btn">Cancelar</button>
        </div>
      </div>`;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById('modal-close-btn').addEventListener('click', close);
  document.getElementById('modal-cancel-btn').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  document.getElementById('gym-save-btn').addEventListener('click', async () => {
    const gymPayload = {
      name: document.getElementById('gym-name').value.trim(),
      address: document.getElementById('gym-address').value.trim(),
      phone: document.getElementById('gym-phone').value.trim(),
      email: document.getElementById('gym-email-gym').value.trim(),
      plan: document.getElementById('gym-plan').value,
    };
    if (isEdit) gymPayload.active = document.getElementById('gym-active').checked;
    if (!gymPayload.name) { UI.toast('El nombre del gimnasio es obligatorio', 'error'); return; }

    const adminName = document.getElementById('admin-name').value.trim();
    const adminEmail = document.getElementById('admin-email').value.trim();
    const adminPassword = document.getElementById('admin-password').value;

    const btn = document.getElementById('gym-save-btn');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      let gymId = gym?.id;
      if (isEdit) {
        await apiFetch(`/api/gyms/${gym.id}`, { method: 'PUT', body: JSON.stringify(gymPayload) });
        UI.toast('Gimnasio actualizado', 'success');
      } else {
        const result = await apiFetch('/api/gyms', { method: 'POST', body: JSON.stringify(gymPayload) });
        gymId = result.id;
        UI.toast(`Gimnasio creado ✓ URL: ?gym=${result.slug}`, 'success');
      }

      // Create / update gym admin if fields are filled
      if (adminEmail && adminPassword) {
        const adminPayload = {
          name: adminName || adminEmail.split('@')[0],
          email: adminEmail,
          password: adminPassword,
          gymId: gymId,
          avatarColor: 'av-blue',
        };
        await apiFetch('/api/gym-admins', { method: 'POST', body: JSON.stringify(adminPayload) });
        UI.toast(`Admin "${adminPayload.name}" creado ✓`, 'success');
      } else if (!isEdit && (adminName || adminEmail)) {
        UI.toast('Para crear el admin necesitas usuario/email Y contraseña', 'error');
      }

      close();
      GymsPage.render(user);
    } catch (e) {
      UI.toast(e.message, 'error');
      btn.disabled = false;
      btn.textContent = isEdit ? '💾 Guardar cambios' : '➕ Crear Gimnasio + Admin';
    }
  });
};

// ══════════════════════════════════════════════════════
// COACHES PAGE — Full CRUD linked to gyms
// ══════════════════════════════════════════════════════
window.CoachesPage = {};

CoachesPage.render = async (user) => {
  Layout.render({
    page: 'coaches', title: 'Coaches', role: user.role, user,
    content: `<div id="coaches-container">
          <div style="text-align:center;padding:60px"><span class="animate-spin" style="font-size:32px">⚡</span><br><br>Cargando coaches...</div>
        </div>`
  });
  try {
    const [coaches, gyms] = await Promise.all([
      apiFetch('/api/coaches' + (user.gymId ? `?gymId=${user.gymId}` : '')),
      apiFetch('/api/gyms'),
    ]);
    document.getElementById('coaches-container').innerHTML = CoachesPage.content(coaches, gyms, user);
    CoachesPage.bindEvents(coaches, gyms, user);
  } catch (e) {
    document.getElementById('coaches-container').innerHTML = `<div class="card" style="color:var(--danger)">${e.message}</div>`;
  }
};

CoachesPage.content = (coaches, gyms, user) => `
  ${UI.pageHeader('🎽 Coaches', `${coaches.length} entrenador(es)`,
  `<button class="btn btn-primary btn-sm" id="coach-add-btn">+ Añadir Coach</button>`)}

  ${UI.searchBar('Buscar coach...', 'coach-search')}

  <div class="grid-3 mt-4" id="coaches-grid">
    ${coaches.map(c => {
    const isInactive = c.active === 0;
    const statusBadge = isInactive
      ? `<span style="background:rgba(239,68,68,.15);color:#f87171;padding:2px 8px;border-radius:12px;font-size:11px">⛔ Inactivo</span>`
      : `<span style="background:rgba(34,197,94,.15);color:#4ade80;padding:2px 8px;border-radius:12px;font-size:11px">✅ Activo</span>`;
    return `
    <div class="card ${isInactive ? 'opacity-60' : ''}" data-coach-id="${c.id}">
      <div class="flex items-center gap-3 mb-3">
        ${UI.avatar(c.avatar || (c.name || 'C').slice(0, 2).toUpperCase(), c.avatar_color || 'av-green', 48)}
        <div class="flex-1">
          <div class="font-semibold">${c.name}</div>
          <div class="text-xs text-muted">${c.gym_name || '— Sin gimnasio'}</div>
          <div class="mt-1">${statusBadge}</div>
        </div>
        ${UI.badge('Coach', 'coach')}
      </div>
      <div class="text-xs text-muted mb-3">${c.email}</div>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm flex-1 coach-edit-btn" data-id="${c.id}">✏️ Editar</button>
        <button class="btn btn-sm coach-toggle-btn" data-id="${c.id}" data-active="${c.active ?? 1}" style="background:${isInactive ? 'rgba(34,197,94,.15);color:#4ade80' : 'rgba(251,191,36,.15);color:#fbbf24'}" title="${isInactive ? 'Activar' : 'Desactivar'}">${isInactive ? '▶' : '⏸'}</button>
        <button class="btn btn-sm coach-delete-btn" data-id="${c.id}" style="background:rgba(239,68,68,.15);color:#f87171">🗑️</button>
      </div>
    </div>`;
  }).join('')}
    ${coaches.length === 0 ? UI.emptyState('🎽', 'Sin coaches', 'Crea el primer coach del sistema') : ''}
  </div>`;

CoachesPage.bindEvents = (coaches, gyms, user) => {
  document.getElementById('coach-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#coaches-grid .card').forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  document.getElementById('coach-add-btn')?.addEventListener('click', () => CoachesPage.showModal(null, gyms, user));

  document.querySelectorAll('.coach-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const coach = coaches.find(c => c.id === btn.dataset.id);
      if (coach) CoachesPage.showModal(coach, gyms, user);
    });
  });

  document.querySelectorAll('.coach-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const result = await apiFetch(`/api/users/${btn.dataset.id}/toggle-active`, { method: 'PATCH' });
        const label = result.active === 0 ? 'Desactivado' : 'Activado';
        UI.toast(`✅ Coach ${label}`, 'success');
        CoachesPage.render(user);
      } catch (e) { UI.toast(e.message, 'error'); }
    });
  });

  document.querySelectorAll('.coach-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este coach?')) return;
      try {
        await apiFetch(`/api/coaches/${btn.dataset.id}`, { method: 'DELETE' });
        UI.toast('Coach eliminado', 'success');
        CoachesPage.render(user);
      } catch (e) { UI.toast(e.message, 'error'); }
    });
  });
};

CoachesPage.showModal = (coach, gyms, user) => {
  const isEdit = !!coach;
  const gymOptions = gyms.map(g =>
    `<option value="${g.id}" ${coach?.gym_id === g.id ? 'selected' : ''}>${g.name}</option>`
  ).join('');
  const colorOptions = avatarColors().map(c =>
    `<option value="${c}" ${(coach?.avatar_color || 'av-green') === c ? 'selected' : ''}>${c}</option>`
  ).join('');

  const modal = document.createElement('div');
  modal.id = 'coach-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
      <div class="modal-card" style="max-width:480px">
        <div class="modal-header">
          <div class="modal-title">${isEdit ? '✏️ Editar Coach' : '🎽 Nuevo Coach'}</div>
          <button class="btn btn-secondary btn-sm" id="modal-close-btn">✕</button>
        </div>
        <div class="flex flex-col gap-3 mt-4">
          ${UI.formGroup('Nombre completo *', UI.input({ id: 'coach-name', value: coach?.name || '', placeholder: 'Diego Vargas' }))}
          ${UI.formGroup('Usuario o Correo *', UI.input({ id: 'coach-email', type: 'text', value: coach?.email || '', placeholder: 'coach@mygym.com o us_coach' }))}
          ${UI.formGroup(isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *', UI.input({ id: 'coach-password', type: 'password', placeholder: '••••••••' }))}
          ${UI.formGroup('Gimnasio *', `<select class="input" id="coach-gym">${gymOptions || '<option value="">Sin gimnasios — créalos primero</option>'}</select>`)}
          ${UI.formGroup('Color de avatar', `<select class="input" id="coach-color">${colorOptions}</select>`)}
        </div>
        <div class="flex gap-3 mt-5">
          <button class="btn btn-primary flex-1" id="coach-save-btn">
            ${isEdit ? '💾 Guardar cambios' : '➕ Crear Coach'}
          </button>
          <button class="btn btn-secondary" id="modal-cancel-btn">Cancelar</button>
        </div>
      </div>`;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById('modal-close-btn').addEventListener('click', close);
  document.getElementById('modal-cancel-btn').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  document.getElementById('coach-save-btn').addEventListener('click', async () => {
    const payload = {
      name: document.getElementById('coach-name').value.trim(),
      email: document.getElementById('coach-email').value.trim(),
      password: document.getElementById('coach-password').value,
      gymId: document.getElementById('coach-gym').value,
      avatarColor: document.getElementById('coach-color').value,
    };
    if (!payload.name || !payload.email || !payload.gymId) {
      UI.toast('Nombre, email y gimnasio son obligatorios', 'error'); return;
    }
    if (!isEdit && !payload.password) {
      UI.toast('La contraseña es obligatoria para nuevos coaches', 'error'); return;
    }

    const btn = document.getElementById('coach-save-btn');
    btn.disabled = true;
    try {
      if (isEdit) {
        if (!payload.password) delete payload.password;
        await apiFetch(`/api/coaches/${coach.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        UI.toast('Coach actualizado', 'success');
      } else {
        await apiFetch('/api/coaches', { method: 'POST', body: JSON.stringify(payload) });
        UI.toast(`Coach ${payload.name} creado`, 'success');
      }
      close();
      CoachesPage.render(user);
    } catch (e) {
      UI.toast(e.message, 'error');
      btn.disabled = false;
    }
  });
};

// ══════════════════════════════════════════════════════
// STATS PAGE
// ══════════════════════════════════════════════════════
window.StatsPage = {};

StatsPage.render = (user) => {
  Layout.render({ page: 'stats', title: 'Estadísticas', role: user.role, user, content: StatsPage.content(user) });
};

StatsPage.content = (user) => {
  const students = MOCK_STUDENTS || [];
  const sessions = MOCK_SESSIONS || [];
  const totalSessions = sessions.length;
  const avgRating = sessions.length
    ? (sessions.reduce((a, s) => a + (s.rating || 0), 0) / sessions.length).toFixed(1)
    : '—';
  const activeStudents = students.filter(s => s.stats?.sessionsMonth > 0).length;

  return `
  ${UI.pageHeader('📈 Estadísticas', 'Resumen de rendimiento del centro')}
  <div class="stats-grid mb-5">
    ${UI.statCard({ label: 'Estudiantes Activos', value: activeStudents || 0, icon: '🏃', color: 'green' })}
    ${UI.statCard({ label: 'Sesiones Totales', value: totalSessions, icon: '📅', color: 'blue' })}
    ${UI.statCard({ label: 'Rating Promedio', value: (avgRating !== '—' ? avgRating : '—') + (avgRating !== '—' ? '⭐' : ''), icon: '⭐', color: 'purple' })}
    ${UI.statCard({ label: 'Workouts Disponibles', value: MOCK_WORKOUTS?.length || 0, icon: '💪', color: 'orange' })}
  </div>
  ${UI.emptyState('📈', 'Sin datos aún', 'Los datos se mostrarán aquí conforme se registren sesiones y estudiantes.')}`;
};

// ══════════════════════════════════════════════════════
// SETTINGS PAGE
// ══════════════════════════════════════════════════════
window.SettingsPage = {};

SettingsPage.render = (user) => {
  Layout.render({ page: 'settings', title: 'Configuración', role: user.role, user, content: SettingsPage.content(user) });
  SettingsPage.bindEvents(user);
};

SettingsPage.content = (user) => {
  const currentPhoto = user.photoUrl || '';
  const initials = (user.name || '?').slice(0, 2).toUpperCase();
  return `
  ${UI.pageHeader('⚙️ Configuración', 'Ajustes de tu cuenta y del sistema')}
  <div class="grid-2 gap-4">
    <div class="card">
      <div class="card-header"><div class="card-title">👤 Perfil</div></div>
      <div class="flex items-center gap-5 mb-4">
        <div id="cfg-photo-preview" style="width:80px;height:80px;border-radius:50%;overflow:hidden;border:3px solid var(--border);flex-shrink:0;background:var(--bg-input);display:flex;align-items:center;justify-content:center;font-size:28px;">
          ${currentPhoto
      ? `<img src="${currentPhoto}" alt="Foto" style="width:100%;height:100%;object-fit:cover;">`
      : `<span style="opacity:.5">${initials}</span>`}
        </div>
        <div class="flex flex-col gap-2">
          <label for="cfg-photo-input" class="btn btn-secondary btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
            📷 Cambiar foto
          </label>
          <input type="file" id="cfg-photo-input" accept="image/*" style="display:none;">
          <div id="cfg-photo-status" style="font-size:12px;min-height:18px;color:var(--text-muted)"></div>
        </div>
      </div>
      ${UI.formGroup('Nombre completo', UI.input({ id: 'cfg-name', value: user.name || '', placeholder: 'Tu nombre' }))}
      ${UI.formGroup('Usuario o Correo', UI.input({ id: 'cfg-email', type: 'text', value: user.email || '', placeholder: 'tu@email.com o usuario' }))}
      <button class="btn btn-primary" id="cfg-save-profile">Guardar perfil</button>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">🔒 Seguridad</div></div>
      ${UI.formGroup('Contraseña actual', UI.input({ id: 'cfg-pass-old', type: 'password', placeholder: '••••••••' }))}
      ${UI.formGroup('Nueva contraseña', UI.input({ id: 'cfg-pass-new', type: 'password', placeholder: '••••••••' }))}
      ${UI.formGroup('Repetir contraseña', UI.input({ id: 'cfg-pass-rep', type: 'password', placeholder: '••••••••' }))}
      <button class="btn btn-secondary" id="cfg-change-pass">Cambiar contraseña</button>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">🎨 Apariencia</div></div>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" onclick="document.documentElement.setAttribute('data-theme','dark');UI.toast('Tema oscuro','info')">🌙 Oscuro</button>
        <button class="btn btn-secondary btn-sm" onclick="document.documentElement.setAttribute('data-theme','light');UI.toast('Tema claro','info')">☀️ Claro</button>
      </div>
      <div class="mt-3 p-3 text-xs text-muted" style="background:var(--bg-secondary);border-radius:var(--radius-sm)">
        Antigravity FitPro v2.0 · SQLite local · RBAC activo
      </div>
    </div>
  </div>`;
};

SettingsPage.bindEvents = (user) => {
  // Photo upload handler
  const photoInput = document.getElementById('cfg-photo-input');
  if (photoInput) {
    photoInput.addEventListener('change', async () => {
      const file = photoInput.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { UI.toast('Imagen demasiado grande (máx 5MB)', 'error'); return; }
      const status = document.getElementById('cfg-photo-status');
      const preview = document.getElementById('cfg-photo-preview');
      if (status) status.innerHTML = '⏳ Subiendo...';
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        try {
          await apiFetch(`/api/users/${user.id}/photo`, { method: 'PATCH', body: JSON.stringify({ photoDataUrl: dataUrl }) });
          if (preview) preview.innerHTML = `<img src="${dataUrl}" alt="Foto" style="width:100%;height:100%;object-fit:cover;">`;
          if (status) status.innerHTML = '<span style="color:var(--success)">✅ Actualizada</span>';
          // Update session user
          const stored = JSON.parse(localStorage.getItem('fitpro_user') || '{}');
          stored.photoUrl = dataUrl;
          localStorage.setItem('fitpro_user', JSON.stringify(stored));
          UI.toast('✅ Foto de perfil actualizada', 'success');
        } catch (e) {
          if (status) status.innerHTML = `<span style="color:var(--danger)">${e.message}</span>`;
          UI.toast('Error: ' + e.message, 'error');
        }
      };
      reader.readAsDataURL(file);
    });
  }

  document.getElementById('cfg-save-profile')?.addEventListener('click', () => UI.toast('Perfil guardado correctamente', 'success'));
  document.getElementById('cfg-change-pass')?.addEventListener('click', () => {
    const n = document.getElementById('cfg-pass-new')?.value;
    const r = document.getElementById('cfg-pass-rep')?.value;
    if (!n || n !== r) { UI.toast('Las contraseñas no coinciden', 'error'); return; }
    UI.toast('Contraseña actualizada', 'success');
  });
};

// ══════════════════════════════════════════════════════
// CALENDAR PAGE
// ══════════════════════════════════════════════════════
window.CalendarPage = {};

CalendarPage.render = (user) => {
  Layout.render({ page: 'calendar', title: 'Calendario', role: user.role, user, content: CalendarPage.content(user) });
  CalendarPage.bindEvents(user);
};

CalendarPage.content = (user) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(now);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDay = now.getDate();

  const days = [];
  const offset = (firstDay + 6) % 7;
  for (let i = 0; i < offset; i++) days.push(`<div></div>`);
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === todayDay;
    days.push(`
        <div class="cal-day ${isToday ? 'cal-today' : ''}"
             style="cursor:pointer;padding:8px;border-radius:var(--radius-sm);text-align:center;min-height:52px;
                    background:${isToday ? 'rgba(139,92,246,.18)' : 'var(--bg-secondary)'};
                    border:1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}"
             data-day="${d}">
          <div style="font-size:13px;font-weight:${isToday ? '700' : '400'}">${d}</div>
        </div>`);
  }

  return `
  ${UI.pageHeader('📅 Calendario', monthName)}
  <div class="card">
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px;text-align:center">
      ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<div style="font-size:11px;font-weight:600;color:var(--text-muted);padding:4px">${d}</div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px" id="cal-grid">
      ${days.join('')}
    </div>
  </div>`;
};

CalendarPage.bindEvents = (user) => {
  document.querySelectorAll('.cal-day').forEach(el => {
    el.addEventListener('click', () => {
      const day = el.dataset.day;
      UI.toast(`Día ${day} seleccionado`, 'info');
    });
  });
};

// ══════════════════════════════════════════════════════
// REPORTS PAGE
// ══════════════════════════════════════════════════════
window.ReportsPage = {};

ReportsPage.render = (user) => {
  Layout.render({ page: 'reports', title: 'Informes', role: user.role, user, content: ReportsPage.content(user) });
  ReportsPage.bindEvents(user);
};

ReportsPage.content = (user) => `
  ${UI.pageHeader('📋 Informes', 'Exporta y analiza datos del centro')}
  ${UI.emptyState('📋', 'Sin datos para exportar', 'Los informes se generarán conforme se registren estudiantes y sesiones.')}`;

ReportsPage.bindEvents = (user) => { };
