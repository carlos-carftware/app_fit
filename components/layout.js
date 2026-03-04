// ============================================================
// Layout — Sidebar + DashboardLayout
// ============================================================

window.Layout = {};

const ROLE_NAV = {
  superadmin: [
    { section: 'Principal' },
    { label: 'Dashboard', icon: '📊', page: 'dashboard' },
    { label: 'Gimnasios', icon: '🏢', page: 'gyms', badge: '4' },
    { label: 'Coaches', icon: '🎽', page: 'coaches' },
    { section: 'Gestión' },
    { label: 'Estadísticas', icon: '📈', page: 'stats' },
    { label: 'Configuración', icon: '⚙️', page: 'settings' },
  ],
  gym: [
    { section: 'Principal' },
    { label: 'Dashboard', icon: '📊', page: 'dashboard' },
    { label: 'Coaches', icon: '🎽', page: 'coaches' },
    { label: 'Estudiantes', icon: '🏃', page: 'students' },
    { section: 'Sesiones' },
    { label: 'Calendario', icon: '📅', page: 'calendar' },
    { label: 'Informes', icon: '📋', page: 'reports' },
  ],
  coach: [
    { section: 'Principal' },
    { label: 'Dashboard', icon: '📊', page: 'dashboard' },
    { label: 'Mis Estudiantes', icon: '🏃', page: 'students', badge: '6' },
    { section: 'Planificación' },
    { label: 'Planificación', icon: '📋', page: 'planning' },
    { label: 'Workouts', icon: '💪', page: 'workouts' },
    { section: 'Timer' },
    { label: 'Timer en vivo', icon: '⏱️', page: 'timer' },
    { label: 'Monitor en Vivo', icon: '👁️', page: 'monitor' },
    { label: 'Pantalla TV', icon: '📺', page: 'timer-display' },
  ],
  student: [
    { section: 'Mi Espacio' },
    { label: 'Dashboard', icon: '📊', page: 'dashboard' },
    { label: 'Mi Perfil', icon: '👤', page: 'my-profile' },
    { section: 'Clase' },
    { label: 'Mi Cronómetro', icon: '⏱️', page: 'timer' },
  ]
};

Layout.renderSidebar = (currentPage, role, user) => {
  const navItems = ROLE_NAV[role] || [];
  const navHtml = navItems.map(item => {
    if (item.section) {
      return `<div class="nav-section-label">${item.section}</div>`;
    }
    const active = currentPage === item.page ? 'active' : '';
    const badge = item.badge ? `<span class="nav-badge">${item.badge}</span>` : '';
    return `<div class="nav-item ${active}" data-navigate="${item.page}" id="nav-${item.page}">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
      ${badge}
    </div>`;
  }).join('');

  const avatarColorMap = { superadmin: 'av-purple', gym: 'av-blue', coach: 'av-orange', student: 'av-green' };
  const avColor = user.avatarColor || avatarColorMap[role] || 'av-purple';

  // Render a real photo if user has one, else fall back to colored initials avatar
  const userAvatarHtml = user.photoUrl
    ? `<div class="avatar ${avColor}" style="width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;"><img src="${user.photoUrl}" alt="Foto" style="width:100%;height:100%;object-fit:cover;"></div>`
    : UI.avatar(user.avatar || 'U', avColor, 36);

  return `
    <div class="sidebar-logo">
      <div class="logo-icon">⚡</div>
      <div class="logo-text">
        <div class="logo-name">Antigravity</div>
        <div class="logo-sub">FitPro System</div>
      </div>
    </div>
    <nav class="sidebar-nav">${navHtml}</nav>
    <div class="sidebar-footer">
      <div class="user-card" data-navigate="profile">
        ${userAvatarHtml}
        <div class="user-info">
          <div class="user-name">${user.name}</div>
          <div class="user-role">${role.charAt(0).toUpperCase() + role.slice(1)}</div>
        </div>
        <button class="sidebar-toggle" id="sidebar-toggle-btn" title="Colapsar menú">☰</button>
      </div>
    </div>
  `;
};

Layout.renderTopbar = (title, role, user, extraActions = '') => {
  const roleLabel = { superadmin: '👑 Super Admin', gym: '🏢 Gym Admin', coach: '🎽 Coach', student: '🏃 Estudiante' };
  return `
    <div class="topbar">
      <span class="topbar-title">${title}</span>
      <div class="topbar-actions">
        ${extraActions}
        ${UI.roleBadge(role)}
        <button class="btn btn-secondary btn-sm" id="logout-btn">🚪 Salir</button>
      </div>
    </div>
  `;
};

Layout.render = ({ page, title, role, user, content, topbarActions = '' }) => {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="app-shell" id="app-shell">
      <aside class="sidebar" id="sidebar">
        ${Layout.renderSidebar(page, role, user)}
      </aside>
      <div class="main-content">
        ${Layout.renderTopbar(title, role, user, topbarActions)}
        <div class="page-content" id="page-content">
          ${content}
        </div>
      </div>
      
      <!-- FLOATING TIMER -->
      <div id="floating-timer-widget" style="display: none; position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: var(--bg-card); padding: 15px 25px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 2px solid var(--accent); cursor: pointer; text-align: center; transition: all 0.2s;" onclick="App.navigate('timer')">
        <div id="ft-phase" style="font-size: 11px; font-weight: bold; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 2px;">ESPERANDO</div>
        <div id="ft-time" style="font-size: 32px; font-weight: bold; font-family: monospace; line-height: 1;">00:00</div>
        <div id="ft-round" style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Ronda 0/0</div>
      </div>
      
    </div>
  `;
  Layout.bindEvents();
};

Layout.updateFloatingTimer = (active, phase, remaining, currentRound, rounds, page) => {
  const widget = document.getElementById('floating-timer-widget');
  if (!widget) return;

  // Hide if inactive, OR if we are ON the timer page (don't show duplicate)
  if (!active || page === 'timer' || page === 'timer-display') {
    widget.style.display = 'none';
    return;
  }

  widget.style.display = 'block';

  const ftPhase = document.getElementById('ft-phase');
  const ftTime = document.getElementById('ft-time');
  const ftRound = document.getElementById('ft-round');

  if (ftPhase) ftPhase.textContent = phase.toUpperCase();
  if (ftRound) ftRound.textContent = `Ronda ${currentRound}/${rounds}`;
  if (ftTime) {
    if (window.TimerPage) ftTime.textContent = window.TimerPage.formatTime(remaining);
    ftTime.style.color = phase === 'work' ? 'var(--success)' : phase === 'rest' ? 'var(--warning)' : '#fff';
  }
};

Layout.bindEvents = () => {
  // Sidebar toggle
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const shell = document.getElementById('app-shell');
  if (toggleBtn && shell) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      shell.classList.toggle('sidebar-collapsed');
    });
  }

  // Navigation
  document.querySelectorAll('[data-navigate]').forEach(el => {
    el.addEventListener('click', () => {
      const page = el.dataset.navigate;
      window.App.navigate(page);
    });
  });

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.logout();
      window.App.navigate('login');
    });
  }
};
