// ============================================================
// App Router — FitPro SaaS (with RBAC guards)
// ============================================================

window.App = {};
App.currentPage = null;

App._navigate = (page, params = {}) => {
    // Dispatch cleanup event
    document.dispatchEvent(new CustomEvent('fitpro-navigate', { detail: { page, params } }));
    App.currentPage = page;

    // Always allow login page
    if (page === 'login') {
        return LoginPage.render();
    }

    // Redirect to login if not authenticated
    if (!Auth.isAuthenticated()) {
        return App.navigate('login');
    }

    const user = Auth.getUser();
    const role = user?.role;

    // RBAC guard: check if current user can access this page
    if (!Auth.can(page)) {
        UI.toast('Acceso denegado para tu rol.', 'error');
        // Navigate to dashboard without RBAC loop risk
        return App._navigate('dashboard');
    }

    const pageHandlers = {
        dashboard: () => DashboardPage.render(user),
        students: () => {
            if (role === 'student') return StudentsPage.renderProfile(user.id, user);
            StudentsPage.render(user);
        },
        'my-profile': () => StudentsPage.renderProfile(user.id, user),
        profile: () => StudentsPage.renderProfile(user.id, user),
        workouts: () => WorkoutsPage.render(user),
        planning: () => PlanningPage.render(user),
        timer: () => {
            if (role === 'student') return TimerPage.renderStudentTimer(user);
            TimerPage.render(user);
        },
        'timer-display': () => TimerPage.renderDisplay(user),
        monitor: () => MonitorPage.render(user),
        gyms: () => GymsPage.render(user),
        coaches: () => CoachesPage.render(user),
        stats: () => StatsPage.render(user),
        settings: () => SettingsPage.render(user),
        calendar: () => CalendarPage.render(user),
        reports: () => ReportsPage.render(user),
    };

    const handler = pageHandlers[page];
    if (handler) {
        handler();
    } else {
        App._navigate('dashboard');
    }
};

// Public navigate — updates hash and delegates to _navigate
App.navigate = (page, params = {}) => {
    if (page !== 'login') {
        history.pushState(null, '', `#${page}`);
    } else {
        history.pushState(null, '', window.location.pathname);
    }
    App._navigate(page, params);
};

App.placeholderPage = (user, title, icon, msg) => {
    Layout.render({
        page: 'dashboard',
        title,
        role: user.role,
        user,
        content: `
      <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
        <div style="text-align:center">
          <div style="font-size:72px;margin-bottom:20px;opacity:.5">${icon}</div>
          <h2 class="page-title" style="font-size:28px;margin-bottom:8px">${title}</h2>
          <p class="text-secondary">${msg}</p>
          <button class="btn btn-primary mt-4" data-navigate="dashboard">← Volver al Dashboard</button>
        </div>
      </div>
    `
    });
};

// ── Initialize App ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const getHashPage = () => window.location.hash.slice(1) || 'dashboard';

    const initialPage = getHashPage();
    App.navigate(Auth.isAuthenticated() ? initialPage : 'login');

    // Listen for hash changes (back/forward)
    window.addEventListener('hashchange', () => {
        App.navigate(getHashPage());
    });

    // Global SmartWOD launch listener
    document.addEventListener('click', (e) => {
        if (e.target.closest('.launch-smartwod-btn')) {
            const btn = e.target.closest('.launch-smartwod-btn');
            sessionStorage.setItem('smartwod_intent', JSON.stringify({
                type: btn.dataset.type,
                config: btn.dataset.cfg ? JSON.parse(btn.dataset.cfg) : {}
            }));
            App.navigate('timer');
        }
    });
});
