// ============================================================
// UI Components — FitPro SaaS
// ============================================================

window.UI = {};

// ── Toast ──────────────────────────────────────────────────
UI.toast = (message, type = 'info', duration = 3500) => {
    const container = document.getElementById('toast-container');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

// ── Badge ──────────────────────────────────────────────────
UI.badge = (text, type) => `<span class="badge badge-${type}">${text}</span>`;

UI.roleBadge = (role) => {
    const labels = { superadmin: '👑 Super Admin', gym: '🏢 Gym', coach: '🎽 Coach', student: '🏃 Student' };
    return UI.badge(labels[role] || role, role);
};

UI.levelBadge = (level) => {
    const labels = { beginner: '🟢 Principiante', intermediate: '🔵 Intermedio', advanced: '🟠 Avanzado', elite: '🏆 Elite' };
    return UI.badge(labels[level] || level, level);
};

// Formato de tiempo inverso: "1:30" => 90 seconds
UI.parseTimeToSeconds = (str) => {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    str = str.toString().trim();
    if (str.includes(':')) {
        const parts = str.split(':');
        return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
    }
    return parseInt(str) || 0;
};

// Segundos a Formato "1:30"
UI.formatSecondsToTime = (seconds) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
    return seconds.toString();
};

UI.roleBadge = (role) => {
    const labels = { superadmin: '👑 Super Admin', gym: '🏢 Gym', coach: '🎽 Coach', student: '🏃 Student' };
    return UI.badge(labels[role] || role, role);
};

UI.levelBadge = (level) => {
    const labels = { beginner: '🟢 Principiante', intermediate: '🔵 Intermedio', advanced: '🟠 Avanzado', elite: '🏆 Elite' };
    return UI.badge(labels[level] || level, level);
};

// ── Avatar ─────────────────────────────────────────────────
UI.avatar = (initials, colorClass = 'av-purple', size = 36) =>
    `<div class="user-avatar ${colorClass}" style="width:${size}px;height:${size}px;font-size:${Math.floor(size * 0.35)}px">${initials}</div>`;

// ── Stat Card ──────────────────────────────────────────────
UI.statCard = ({ label, value, change, icon, color = 'purple' }) =>
    `<div class="stat-card ${color}">
    <div class="stat-icon">${icon || ''}</div>
    <div class="stat-label">${label}</div>
    <div class="stat-value">${value}</div>
    ${change ? `<div class="stat-change positive">${change}</div>` : ''}
  </div>`;

// ── Card ───────────────────────────────────────────────────
UI.card = (content, extraClass = '') =>
    `<div class="card ${extraClass}">${content}</div>`;

// ── Page Header ────────────────────────────────────────────
UI.pageHeader = (title, subtitle, actions = '') =>
    `<div class="page-header">
    <div>
      <h1 class="page-title">${title}</h1>
      ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
    </div>
    ${actions ? `<div class="topbar-actions">${actions}</div>` : ''}
  </div>`;

// ── Search Bar ─────────────────────────────────────────────
UI.searchBar = (placeholder = 'Buscar...', id = 'search') =>
    `<div class="search-bar">
    <span class="search-icon">🔍</span>
    <input type="text" id="${id}" placeholder="${placeholder}" />
  </div>`;

// ── Tabs ───────────────────────────────────────────────────
UI.tabs = (items, activeIdx = 0, id = 'tabs') => {
    const tabs = items.map((item, i) =>
        `<div class="tab ${i === activeIdx ? 'active' : ''}" data-tab="${id}" data-idx="${i}">${item}</div>`
    ).join('');
    return `<div class="tabs">${tabs}</div>`;
};

// ── Form helpers ───────────────────────────────────────────
UI.formGroup = (label, input) =>
    `<div class="form-group"><label class="form-label">${label}</label>${input}</div>`;

UI.input = (attrs = {}) => {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<input class="form-input" ${a} />`;
};

UI.select = (name, options, value = '') => {
    const opts = options.map(o =>
        typeof o === 'string'
            ? `<option value="${o}" ${o === value ? 'selected' : ''}>${o}</option>`
            : `<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${o.label}</option>`
    ).join('');
    return `<select class="form-select" name="${name}" id="${name}">${opts}</select>`;
};

UI.textarea = (attrs = {}) => {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<textarea class="form-textarea" ${a}></textarea>`;
};

UI.rangeInput = (attrs = {}) => {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<input type="range" class="form-range" ${a} />`;
};

// ── Loader ─────────────────────────────────────────────────
UI.loader = () =>
    `<div style="display:flex;align-items:center;justify-content:center;padding:60px">
    <div style="font-size:32px;animation:spin 1s linear infinite">⚡</div>
  </div>`;

// ── Macro bar ──────────────────────────────────────────────
UI.macroBar = (label, grams, total, type, color) => {
    const pct = Math.min(100, Math.round((grams / total) * 100));
    const kcalsPer = { protein: 4, carbs: 4, fat: 9 };
    const kcal = (grams * (kcalsPer[type] || 4)).toFixed(0);
    return `<div class="mb-3">
    <div class="flex justify-between text-sm mb-2">
      <span class="font-semibold">${label}</span>
      <span class="text-muted">${grams}g · ${kcal} kcal · ${pct}%</span>
    </div>
    <div class="macro-bar">
      <div class="macro-bar-fill ${type}" style="width:${pct}%"></div>
    </div>
  </div>`;
};

// ── Empty state ────────────────────────────────────────────
UI.emptyState = (icon, title, desc) =>
    `<div class="empty-state">
    <div class="empty-state-icon">${icon}</div>
    <div class="empty-state-title">${title}</div>
    <div class="empty-state-desc">${desc}</div>
  </div>`;

// ── Tab switching utility ──────────────────────────────────
document.addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;
    const id = tab.dataset.tab;
    const idx = parseInt(tab.dataset.idx);
    document.querySelectorAll(`[data-tab="${id}"]`).forEach((el, i) => {
        el.classList.toggle('active', i === idx);
    });
    // emit custom event for page to handle
    document.dispatchEvent(new CustomEvent('tab-change', { detail: { id, idx } }));
});
