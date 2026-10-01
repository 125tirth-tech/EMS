// ═══════════════════════════════════════════════════════════════
// Auth Page - Login, Signup, Password Reset
// ═══════════════════════════════════════════════════════════════

const AuthPage = {
  currentTab: 'login',
  selectedRole: 'employee',

  render() {
    document.getElementById('app').innerHTML = `
      <div class="auth-container">
        <div class="auth-card fade-in-up">
          <button class="theme-toggle-btn" onclick="App.toggleTheme()" id="auth-theme-toggle" title="Toggle Light/Dark Theme" style="position: absolute; top: 1.25rem; right: 1.25rem;">
            ${App.theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div class="logo">
            <h1>⚡ EMS Pro</h1>
            <p>Employee Management Suite</p>
          </div>

          <div class="auth-tabs" id="auth-tabs">
            <button class="auth-tab active" onclick="AuthPage.switchTab('login')" data-tab="login">Sign In</button>
            <button class="auth-tab" onclick="AuthPage.switchTab('signup')" data-tab="signup">Sign Up</button>
          </div>

          <div id="auth-alert"></div>

          <div id="auth-form-container">
            ${this.renderLoginForm()}
          </div>
        </div>
      </div>
    `;
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.auth-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    document.getElementById('auth-alert').innerHTML = '';
    
    const container = document.getElementById('auth-form-container');
    if (tab === 'login') container.innerHTML = this.renderLoginForm();
    else if (tab === 'signup') container.innerHTML = this.renderSignupForm();
    else if (tab === 'forgot') container.innerHTML = this.renderForgotForm();
    else if (tab === 'reset') container.innerHTML = this.renderResetForm();
    else if (tab === 'set-password') container.innerHTML = this.renderSetPasswordForm();
  },

  selectRole(role) {
    this.selectedRole = role;
    document.querySelectorAll('.role-card').forEach(el => {
      el.classList.toggle('active', el.dataset.role === role);
    });
  },

  renderLoginForm() {
    return `
      <form onsubmit="AuthPage.handleLogin(event)" id="login-form">
        <div class="form-group">
          <label>Login As</label>
          <div class="role-selector">
            <div class="role-card ${this.selectedRole === 'admin' ? 'active' : ''}" data-role="admin" onclick="AuthPage.selectRole('admin')">
              <div class="role-icon role-icon-admin">🛡️</div>
              <div class="role-label">Admin</div>
            </div>
            <div class="role-card ${this.selectedRole === 'hr' ? 'active' : ''}" data-role="hr" onclick="AuthPage.selectRole('hr')">
              <div class="role-icon role-icon-hr">👔</div>
              <div class="role-label">HR</div>
            </div>
            <div class="role-card ${this.selectedRole === 'employee' ? 'active' : ''}" data-role="employee" onclick="AuthPage.selectRole('employee')">
              <div class="role-icon role-icon-employee">👤</div>
              <div class="role-label">Employee</div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label for="login-username">Username or Email</label>
          <input type="text" id="login-username" class="form-control" placeholder="Enter username or email" required autofocus>
        </div>
        <div class="form-group">
          <label for="login-password">Password</label>
          <input type="password" id="login-password" class="form-control" placeholder="Enter password" required>
        </div>
        <button type="submit" class="btn btn-primary btn-block btn-lg" id="login-btn">
          Sign In
        </button>
        <p class="text-center text-sm mt-2">
          <a href="#" onclick="AuthPage.switchTab('forgot'); return false" style="color:var(--accent-primary-light)">Forgot password?</a>
        </p>
      </form>
    `;
  },

  renderSignupForm() {
    return `
      <form onsubmit="AuthPage.handleSignup(event)" id="signup-form">
        <p class="text-sm text-muted mb-2">Create an HR admin account to manage employees</p>
        <div class="form-group">
          <label for="signup-username">Username</label>
          <input type="text" id="signup-username" class="form-control" placeholder="Choose a username" required minlength="3">
        </div>
        <div class="form-group">
          <label for="signup-email">Email</label>
          <input type="email" id="signup-email" class="form-control" placeholder="Enter your email" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="signup-password">Password</label>
            <input type="password" id="signup-password" class="form-control" placeholder="Min 6 characters" required minlength="6">
          </div>
          <div class="form-group">
            <label for="signup-confirm">Confirm</label>
            <input type="password" id="signup-confirm" class="form-control" placeholder="Confirm password" required>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block btn-lg" id="signup-btn">
          Create Account
        </button>
      </form>
    `;
  },

  renderForgotForm() {
    return `
      <form onsubmit="AuthPage.handleForgot(event)">
        <h2 style="font-size:1.2rem;margin-bottom:1rem">Reset Password</h2>
        <p class="text-sm text-muted mb-2">Enter your email and we'll generate a reset token.</p>
        <div class="form-group">
          <label for="forgot-email">Email Address</label>
          <input type="email" id="forgot-email" class="form-control" placeholder="Enter your email" required>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="forgot-btn">Send Reset Token</button>
        <p class="text-center text-sm mt-2">
          <a href="#" onclick="AuthPage.switchTab('login'); return false" style="color:var(--accent-primary-light)">← Back to login</a>
        </p>
      </form>
    `;
  },

  renderResetForm() {
    return `
      <form onsubmit="AuthPage.handleReset(event)">
        <h2 style="font-size:1.2rem;margin-bottom:1rem">Set New Password</h2>
        <div class="form-group">
          <label for="reset-email">Email</label>
          <input type="email" id="reset-email" class="form-control" placeholder="Your email" required>
        </div>
        <div class="form-group">
          <label for="reset-token">Reset Token</label>
          <input type="text" id="reset-token" class="form-control" placeholder="Paste reset token" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="reset-password">New Password</label>
            <input type="password" id="reset-password" class="form-control" placeholder="Min 6 chars" required minlength="6">
          </div>
          <div class="form-group">
            <label for="reset-confirm">Confirm</label>
            <input type="password" id="reset-confirm" class="form-control" placeholder="Confirm" required>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="reset-btn">Reset Password</button>
        <p class="text-center text-sm mt-2">
          <a href="#" onclick="AuthPage.switchTab('login'); return false" style="color:var(--accent-primary-light)">← Back to login</a>
        </p>
      </form>
    `;
  },

  renderSetPasswordForm() {
    return `
      <form onsubmit="AuthPage.handleSetPassword(event)">
        <h2 style="font-size:1.2rem;margin-bottom:1rem">Set Your Password</h2>
        <div class="alert alert-info">You must set a new password before continuing.</div>
        <div class="form-row">
          <div class="form-group">
            <label for="set-password">New Password</label>
            <input type="password" id="set-password" class="form-control" placeholder="Min 6 chars" required minlength="6">
          </div>
          <div class="form-group">
            <label for="set-confirm">Confirm</label>
            <input type="password" id="set-confirm" class="form-control" placeholder="Confirm" required>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="set-btn">Set Password & Continue</button>
      </form>
    `;
  },

  showAlert(msg, type = 'error') {
    document.getElementById('auth-alert').innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
  },

  async handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      const data = await AuthAPI.login({
        username: document.getElementById('login-username').value.trim(),
        password: document.getElementById('login-password').value,
        role: this.selectedRole
      });

      if (data.requirePasswordChange) {
        this._setupToken = data.setupToken;
        this.switchTab('set-password');
        return;
      }

      App.setAuth(data.token, data.user);
      App.renderApp();
      App.showToast('Welcome back! 👋', 'success');
    } catch (err) {
      this.showAlert(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  },

  async handleSignup(e) {
    e.preventDefault();
    const btn = document.getElementById('signup-btn');
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      const password = document.getElementById('signup-password').value;
      const confirm = document.getElementById('signup-confirm').value;
      if (password !== confirm) {
        this.showAlert('Passwords do not match.');
        return;
      }

      const data = await AuthAPI.signup({
        username: document.getElementById('signup-username').value.trim(),
        email: document.getElementById('signup-email').value.trim(),
        password,
        confirmPassword: confirm
      });

      App.setAuth(data.token, data.user);
      App.renderApp();
      App.showToast('Account created successfully! 🎉', 'success');
    } catch (err) {
      this.showAlert(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  },

  async handleForgot(e) {
    e.preventDefault();
    const btn = document.getElementById('forgot-btn');
    btn.disabled = true;

    try {
      const data = await AuthAPI.forgotPassword({
        email: document.getElementById('forgot-email').value.trim()
      });

      if (data.resetToken) {
        this.showAlert(`Reset token generated. For demo: ${data.resetToken.substring(0, 20)}...`, 'success');
        setTimeout(() => this.switchTab('reset'), 2000);
      } else {
        this.showAlert(data.message, 'success');
      }
    } catch (err) {
      this.showAlert(err.message);
    } finally {
      btn.disabled = false;
    }
  },

  async handleReset(e) {
    e.preventDefault();
    const btn = document.getElementById('reset-btn');
    btn.disabled = true;

    try {
      const data = await AuthAPI.resetPassword({
        email: document.getElementById('reset-email').value.trim(),
        resetToken: document.getElementById('reset-token').value.trim(),
        newPassword: document.getElementById('reset-password').value,
        confirmPassword: document.getElementById('reset-confirm').value
      });

      this.showAlert(data.message, 'success');
      setTimeout(() => this.switchTab('login'), 2000);
    } catch (err) {
      this.showAlert(err.message);
    } finally {
      btn.disabled = false;
    }
  },

  async handleSetPassword(e) {
    e.preventDefault();
    const btn = document.getElementById('set-btn');
    btn.disabled = true;

    try {
      const data = await AuthAPI.setPassword({
        setupToken: this._setupToken,
        newPassword: document.getElementById('set-password').value,
        confirmPassword: document.getElementById('set-confirm').value
      });

      App.setAuth(data.token, data.user);
      App.renderApp();
      App.showToast('Password set successfully!', 'success');
    } catch (err) {
      this.showAlert(err.message);
    } finally {
      btn.disabled = false;
    }
  }
};
