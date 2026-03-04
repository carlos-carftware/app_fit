// ============================================================
// Login Page — Real auth via API, no demo tabs
// ============================================================

window.LoginPage = {};

LoginPage.render = () => {
  document.getElementById('app').innerHTML = `
    <div class="login-page">
      <div class="login-bg-orbs">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>
      <div class="login-card">
        <div class="login-logo">
          <div class="login-logo-icon">⚡</div>
          <div class="login-text">Antigravity FitPro</div>
          <div class="login-subtext">Sistema de Gestión Fitness Pro</div>
        </div>

        <form id="login-form">
          <div class="flex flex-col gap-3">
            ${UI.formGroup('Usuario o Correo', UI.input({ type: 'text', id: 'login-identifier', placeholder: 'tu@correo.com o tu_usuario', autocomplete: 'username' }))}
            ${UI.formGroup('Contraseña', UI.input({ type: 'password', id: 'login-password', placeholder: '••••••••', autocomplete: 'current-password' }))}
            <div id="login-error" class="text-sm" style="color:var(--danger);min-height:20px;text-align:center"></div>
            <button type="submit" class="btn btn-primary btn-lg w-full" id="login-submit-btn">
              <span>⚡</span> Iniciar Sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  LoginPage.bindEvents();
};

LoginPage.bindEvents = () => {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-submit-btn');
    const errorEl = document.getElementById('login-error');

    if (!identifier || !password) {
      errorEl.textContent = 'Por favor completa todos los campos.';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="animate-spin">⚡</span> Verificando...';
    errorEl.textContent = '';

    const result = await Auth.login(identifier, password);

    if (result.success) {
      UI.toast('¡Bienvenido, ' + result.user.name + '!', 'success');
      window.App.navigate('dashboard');
    } else {
      errorEl.textContent = result.error;
      btn.disabled = false;
      btn.innerHTML = '<span>⚡</span> Iniciar Sesión';
    }
  });
};
