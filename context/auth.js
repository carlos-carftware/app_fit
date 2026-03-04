// ============================================================
// Auth Context — Real authentication via API
// ============================================================

window.Auth = (() => {
    const STORAGE_KEY = 'fitpro_user';
    const API_URL = 'http://localhost:5000';
    let _sessionWatcherInterval = null;

    function getUser() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    async function login(usernameOrEmail, password) {
        try {
            const res = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernameOrEmail, password })
            });
            const data = await res.json();
            if (!res.ok) {
                return { success: false, error: data.error || 'Credenciales incorrectas' };
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
            _startSessionWatcher();
            return { success: true, user: data.user };
        } catch (err) {
            return { success: false, error: 'No se pudo conectar al servidor. ¿Está corriendo el backend?' };
        }
    }

    function logout() {
        _stopSessionWatcher();
        localStorage.removeItem(STORAGE_KEY);
    }

    function isAuthenticated() {
        return !!getUser();
    }

    function requireAuth(fn) {
        if (!isAuthenticated()) {
            window.App.navigate('login');
            return;
        }
        fn(getUser());
    }

    // Check this account is still active every 45 seconds
    function _startSessionWatcher() {
        _stopSessionWatcher();
        _sessionWatcherInterval = setInterval(async () => {
            const user = getUser();
            if (!user) { _stopSessionWatcher(); return; }
            try {
                const res = await fetch(`${API_URL}/api/check-session?userId=${encodeURIComponent(user.id)}&role=${user.role}`);
                const data = await res.json();
                if (!data.active) {
                    _stopSessionWatcher();
                    localStorage.removeItem(STORAGE_KEY);
                    if (window.UI) UI.toast('⚠️ Tu cuenta ha sido desactivada. Sesión cerrada.', 'error');
                    setTimeout(() => window.App.navigate('login'), 1500);
                }
            } catch { /* silently ignore network errors */ }
        }, 45000);
    }

    function _stopSessionWatcher() {
        if (_sessionWatcherInterval) {
            clearInterval(_sessionWatcherInterval);
            _sessionWatcherInterval = null;
        }
    }

    // Start watcher if already logged in (page reload)
    if (localStorage.getItem(STORAGE_KEY)) {
        _startSessionWatcher();
    }

    // Role permission check
    const ROLE_PAGES = {
        superadmin: ['dashboard', 'gyms', 'coaches', 'stats', 'settings', 'students', 'planning', 'workouts', 'timer', 'timer-display', 'monitor', 'calendar', 'reports', 'profile', 'my-profile'],
        gym: ['dashboard', 'coaches', 'students', 'calendar', 'reports', 'settings', 'planning', 'workouts', 'profile', 'my-profile'],
        coach: ['dashboard', 'students', 'planning', 'workouts', 'timer', 'timer-display', 'monitor', 'settings', 'profile', 'my-profile'],
        student: ['dashboard', 'my-profile', 'timer', 'profile'],
    };

    function can(page) {
        const user = getUser();
        if (!user) return false;
        const allowed = ROLE_PAGES[user.role] || [];
        return allowed.includes(page);
    }

    return { getUser, login, logout, isAuthenticated, requireAuth, can };
})();
