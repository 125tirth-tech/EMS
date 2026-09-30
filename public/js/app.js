// ═══════════════════════════════════════════════════════════════
// App.js - Main SPA Router and Layout Controller
// ═══════════════════════════════════════════════════════════════

const App = {
  currentPage: null,
  user: null,
  notificationInterval: null,

  init() {
    this.user = this.getUser();
    if (this.user) {
      this.renderApp();
      this.startNotificationPolling();
    } else {
      this.renderAuth();
    }
  },

  getUser() {
    try {
      const data = localStorage.getItem('ems_user');
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },

  getToken() {
    return localStorage.getItem('ems_token');
  },

  setAuth(token, user) {
    localStorage.setItem('ems_token', token);
    localStorage.setItem('ems_user', JSON.stringify(user));
    this.user = user;
  },

  logout() {
    localStorage.removeItem('ems_token');
    localStorage.removeItem('ems_user');
    this.user = null;
    clearInterval(this.notificationInterval);
    this.renderAuth();
  },

  isAdminOrHR() {
    return this.user && ['admin', 'hr'].includes(this.user.role);
  },

  // ─── Toast System ───────────────────────────────────────
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    toast.innerHTML = `
      <span>${icons[type] || 'ℹ'}</span>
      <span>${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
  },

  // ─── Notification Polling ───────────────────────────────
  async startNotificationPolling() {
    this.updateNotificationBadge();
    this.notificationInterval = setInterval(() => {
      this.updateNotificationBadge();
    }, 30000);
  },

  async updateNotificationBadge() {
    try {
      const data = await NotificationAPI.getUnreadCount();
      const badge = document.getElementById('notif-badge');
      if (badge) {
        if (data.count > 0) {
          badge.textContent = data.count > 99 ? '99+' : data.count;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    } catch (e) { /* ignore */ }
  },

  // ─── Auth Page ──────────────────────────────────────────
  renderAuth() {
    document.getElementById('app').innerHTML = '';
    AuthPage.render();
  },

  // ─── Main App Layout ───────────────────────────────────
  renderApp() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="app-layout">
        <div class="sidebar-overlay" id="sidebar-overlay" onclick="App.toggleSidebar()"></div>
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <div class="brand-icon">E</div>
            <div>
              <h2>EMS Pro</h2>
              <div class="brand-subtitle">Management Suite</div>
            </div>
          </div>
          <nav class="sidebar-nav">
            ${this.renderNavItems()}
          </nav>
          <div class="sidebar-footer">
            <div class="user-info">
              <div class="user-avatar">${(this.user.username || 'U')[0].toUpperCase()}</div>
              <div class="user-details">
                <div class="user-name">${this.user.username}</div>
                <div class="user-role">${this.user.role}</div>
              </div>
            </div>
            <button class="btn btn-ghost btn-block btn-sm mt-1" onclick="App.logout()" style="justify-content:flex-start;gap:0.5rem">
              <span>🚪</span> Sign Out
            </button>
          </div>
        </aside>
        <main class="main-content">
          <header class="top-bar">
            <div style="display:flex;align-items:center;gap:0.75rem">
              <button class="mobile-toggle" onclick="App.toggleSidebar()">☰</button>
              <div>
                <div class="page-title" id="page-title">Dashboard</div>
                <div class="page-subtitle" id="page-subtitle">Welcome back, ${this.user.username}</div>
              </div>
            </div>
            <div class="top-bar-actions">
              <div class="notification-bell" onclick="App.toggleNotifications()" id="notif-bell">
                🔔
                <span class="badge hidden" id="notif-badge">0</span>
              </div>
            </div>
          </header>
          <div class="page-content" id="page-content">
          </div>
        </main>
        <div class="notification-panel" id="notification-panel">
          <div class="notification-panel-header">
            <h3>Notifications</h3>
            <div style="display:flex;gap:0.5rem">
              <button class="btn btn-ghost btn-sm" onclick="NotificationsPage.markAllRead()">Mark all read</button>
              <button class="modal-close" onclick="App.toggleNotifications()">×</button>
            </div>
          </div>
          <div class="notification-list" id="notification-list">
            <div class="loading-spinner"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    `;

    this.navigate('dashboard');
  },

  renderNavItems() {
    const isAdmin = this.isAdminOrHR();
    const isEmployee = this.user.role === 'employee';

    let html = `
      <div class="nav-section">
        <div class="nav-section-title">Main</div>
        <div class="nav-item active" onclick="App.navigate('dashboard')" data-page="dashboard">
          <span class="nav-icon">📊</span> Dashboard
        </div>
    `;

    if (isAdmin) {
      html += `
        <div class="nav-item" onclick="App.navigate('employees')" data-page="employees">
          <span class="nav-icon">👥</span> Employees
        </div>
      `;
    }

    html += `
      </div>
      <div class="nav-section">
        <div class="nav-section-title">Modules</div>
        <div class="nav-item" onclick="App.navigate('attendance')" data-page="attendance">
          <span class="nav-icon">⏰</span> Attendance
        </div>
        <div class="nav-item" onclick="App.navigate('leaves')" data-page="leaves">
          <span class="nav-icon">🏖️</span> Leave Management
        </div>
        <div class="nav-item" onclick="App.navigate('payroll')" data-page="payroll">
          <span class="nav-icon">💰</span> Payroll
        </div>
    `;

    if (isEmployee) {
      html += `
        <div class="nav-item" onclick="App.navigate('documents')" data-page="documents">
          <span class="nav-icon">📄</span> My Documents
        </div>
      `;
    }

    if (isAdmin) {
      html += `
        <div class="nav-item" onclick="App.navigate('documents')" data-page="documents">
          <span class="nav-icon">📄</span> Documents
        </div>
      `;
    }

    html += `
      </div>
      <div class="nav-section">
        <div class="nav-section-title">AI</div>
        <div class="nav-item" onclick="App.navigate('ai-assistant')" data-page="ai-assistant">
          <span class="nav-icon">🤖</span> AI Assistant
        </div>
      </div>
    `;

    if (isEmployee) {
      html += `
        <div class="nav-section">
          <div class="nav-section-title">Account</div>
          <div class="nav-item" onclick="App.navigate('profile')" data-page="profile">
            <span class="nav-icon">👤</span> My Profile
          </div>
        </div>
      `;
    }

    return html;
  },

  navigate(page, data = null) {
    this.currentPage = page;

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // Update title
    const titles = {
      dashboard: ['Dashboard', `Welcome back, ${this.user.username}`],
      employees: ['Employees', 'Manage your team members'],
      attendance: ['Attendance', 'Track daily attendance'],
      leaves: ['Leave Management', 'Manage leave requests'],
      payroll: ['Payroll', 'Salary management'],
      documents: ['Documents', 'Document management'],
      profile: ['My Profile', 'View your profile details'],
      'ai-assistant': ['AI Assistant', 'Intelligent conversational assistant and HR analytics'],
      'employee-detail': ['Employee Details', 'View employee information'],
      'employee-form': ['Employee Form', data ? 'Edit employee' : 'Add new employee']
    };

    const [title, subtitle] = titles[page] || ['EMS', ''];
    document.getElementById('page-title').textContent = title;
    document.getElementById('page-subtitle').textContent = subtitle;

    // Close sidebar on mobile
    this.closeSidebar();

    // Render page
    const content = document.getElementById('page-content');
    content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    const pages = {
      dashboard: () => DashboardPage.render(),
      employees: () => EmployeesPage.render(),
      attendance: () => AttendancePage.render(),
      leaves: () => LeavesPage.render(),
      payroll: () => PayrollPage.render(),
      documents: () => DocumentsPage.render(),
      profile: () => ProfilePage.render(),
      'ai-assistant': () => AiAssistantPage.render(),
      'employee-detail': () => EmployeeDetailPage.render(data),
      'employee-form': () => EmployeeFormPage.render(data)
    };

    if (pages[page]) {
      setTimeout(() => pages[page](), 50);
    }
  },

  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('open');
  },

  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');
  },

  async toggleNotifications() {
    const panel = document.getElementById('notification-panel');
    panel.classList.toggle('open');

    if (panel.classList.contains('open')) {
      await NotificationsPage.loadPanel();
    }
  },

  // ─── Helpers ────────────────────────────────────────────
  formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  },

  formatTime(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    });
  },

  formatCurrency(amount) {
    return '₹' + (amount || 0).toLocaleString('en-IN');
  },

  getAvatarColor(name) {
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
      '#10b981', '#06b6d4', '#3b82f6', '#14b8a6', '#f97316'
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  },

  getStatusBadge(status) {
    const map = {
      active: 'badge-success',
      inactive: 'badge-danger',
      'on-leave': 'badge-warning',
      present: 'badge-success',
      late: 'badge-warning',
      absent: 'badge-danger',
      'half-day': 'badge-info',
      pending: 'badge-warning',
      approved: 'badge-success',
      rejected: 'badge-danger',
      draft: 'badge-muted',
      processed: 'badge-info',
      paid: 'badge-success',
      'password-not-set': 'badge-warning'
    };
    return `<span class="badge ${map[status] || 'badge-muted'}">${status}</span>`;
  },

  renderPagination(page, pages, callback) {
    if (pages <= 1) return '';
    let html = '<div class="pagination">';
    html += `<button ${page <= 1 ? 'disabled' : ''} onclick="${callback}(${page - 1})">‹ Prev</button>`;
    
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
        html += `<button class="${i === page ? 'active' : ''}" onclick="${callback}(${i})">${i}</button>`;
      } else if (i === page - 2 || i === page + 2) {
        html += '<span class="pagination-info">...</span>';
      }
    }
    
    html += `<button ${page >= pages ? 'disabled' : ''} onclick="${callback}(${page + 1})">Next ›</button>`;
    html += '</div>';
    return html;
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => App.init());
