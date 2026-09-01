// ═══════════════════════════════════════════════════════════════
// Attendance Page
// ═══════════════════════════════════════════════════════════════

const AttendancePage = {
  currentTab: 'overview',

  async render() {
    const content = document.getElementById('page-content');
    const isAdmin = App.isAdminOrHR();

    content.innerHTML = `
      <div class="fade-in-up">
        <div class="tabs">
          <button class="tab ${this.currentTab === 'overview' ? 'active' : ''}" onclick="AttendancePage.switchTab('overview')">Overview</button>
          <button class="tab ${this.currentTab === 'history' ? 'active' : ''}" onclick="AttendancePage.switchTab('history')">My History</button>
          ${isAdmin ? `<button class="tab ${this.currentTab === 'manage' ? 'active' : ''}" onclick="AttendancePage.switchTab('manage')">Manage</button>` : ''}
        </div>
        <div id="attendance-content">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    this.loadTab();
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    this.loadTab();
  },

  async loadTab() {
    const container = document.getElementById('attendance-content');
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    if (this.currentTab === 'overview') await this.renderOverview(container);
    else if (this.currentTab === 'history') await this.renderHistory(container);
    else if (this.currentTab === 'manage') await this.renderManage(container);
  },

  async renderOverview(container) {
    try {
      const [todayData, summaryData] = await Promise.all([
        AttendanceAPI.getToday().catch(() => ({ attendance: null })),
        AttendanceAPI.getSummary().catch(() => ({ summary: {} }))
      ]);

      const att = todayData.attendance;
      const summary = summaryData.summary || {};

      container.innerHTML = `
        <div class="grid-2">
          <div class="card">
            <div class="attendance-clock">
              <div class="clock-time" id="live-clock-2"></div>
              <div class="clock-date">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div class="attendance-actions">
                ${!att || !att.checkIn
                  ? '<button class="btn btn-success btn-lg" onclick="AttendancePage.checkIn()">⏰ Check In</button>'
                  : !att.checkOut
                    ? '<button class="btn btn-danger btn-lg" onclick="AttendancePage.checkOut()">🚪 Check Out</button>'
                    : `<div class="badge badge-success" style="font-size:0.9rem;padding:0.5rem 1rem">✓ Day Complete - ${(att.hoursWorked || 0).toFixed(1)}h</div>`
                }
              </div>
            </div>
            ${att ? `
              <div class="grid-2" style="margin-top:1rem">
                <div class="attendance-status-card">
                  <div class="status-label">Check In</div>
                  <div class="status-time" style="color:var(--accent-success)">${att.checkIn ? App.formatTime(att.checkIn) : '--:--'}</div>
                </div>
                <div class="attendance-status-card">
                  <div class="status-label">Check Out</div>
                  <div class="status-time" style="color:var(--accent-danger)">${att.checkOut ? App.formatTime(att.checkOut) : '--:--'}</div>
                </div>
              </div>
              <div class="text-center mt-1">
                <span class="text-sm">Status: ${App.getStatusBadge(att.status)}</span>
              </div>
            ` : '<p class="text-center text-muted mt-2">You haven\'t checked in today</p>'}
          </div>

          <div class="card">
            <div class="card-header"><h3>Monthly Summary</h3></div>
            <div class="attendance-summary-grid">
              <div class="summary-item">
                <div class="summary-count" style="color:var(--accent-success)">${summary.present || 0}</div>
                <div class="summary-label">Present</div>
              </div>
              <div class="summary-item">
                <div class="summary-count" style="color:var(--accent-warning)">${summary.late || 0}</div>
                <div class="summary-label">Late</div>
              </div>
              <div class="summary-item">
                <div class="summary-count" style="color:var(--accent-danger)">${summary.absent || 0}</div>
                <div class="summary-label">Absent</div>
              </div>
              <div class="summary-item">
                <div class="summary-count" style="color:var(--accent-info)">${summary.halfDay || 0}</div>
                <div class="summary-label">Half Day</div>
              </div>
              <div class="summary-item">
                <div class="summary-count" style="color:var(--accent-primary-light)">${summary.averageHours || 0}h</div>
                <div class="summary-label">Avg Hours</div>
              </div>
              <div class="summary-item">
                <div class="summary-count">${summary.workingDays || 0}</div>
                <div class="summary-label">Work Days</div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Start clock
      const el = document.getElementById('live-clock-2');
      if (el) {
        const update = () => {
          if (!document.getElementById('live-clock-2')) return;
          el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          requestAnimationFrame(update);
        };
        update();
      }
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  },

  async renderHistory(container) {
    try {
      const data = await AttendanceAPI.getMyHistory({ limit: 20 });
      const records = data.records || [];

      container.innerHTML = `
        <div class="card">
          <div class="card-header"><h3>Attendance History</h3></div>
          ${records.length > 0 ? `
            <div class="table-container">
              <table class="data-table">
                <thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th></tr></thead>
                <tbody>
                  ${records.map(r => `
                    <tr>
                      <td>${App.formatDate(r.date)}</td>
                      <td>${r.checkIn ? App.formatTime(r.checkIn) : '-'}</td>
                      <td>${r.checkOut ? App.formatTime(r.checkOut) : '-'}</td>
                      <td>${r.hoursWorked ? r.hoursWorked.toFixed(1) + 'h' : '-'}</td>
                      <td>${App.getStatusBadge(r.status)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ${App.renderPagination(data.page, data.pages, 'AttendancePage.historyPage')}
          ` : '<div class="empty-state"><div class="empty-icon">📋</div><p>No attendance records found</p></div>'}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  },

  async renderManage(container) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await AttendanceAPI.getAll({ date: today });
      const records = data.records || [];
      const summary = data.summary || {};

      container.innerHTML = `
        <div class="stats-grid mb-2">
          <div class="stat-card success"><div class="stat-icon">✓</div><div class="stat-info"><h4>Present</h4><div class="stat-value">${summary.totalPresent || 0}</div></div></div>
          <div class="stat-card warning"><div class="stat-icon">⏰</div><div class="stat-info"><h4>Late</h4><div class="stat-value">${summary.totalLate || 0}</div></div></div>
          <div class="stat-card danger"><div class="stat-icon">✕</div><div class="stat-info"><h4>Absent</h4><div class="stat-value">${summary.totalAbsent || 0}</div></div></div>
          <div class="stat-card info"><div class="stat-icon">👥</div><div class="stat-info"><h4>Total</h4><div class="stat-value">${summary.totalEmployees || 0}</div></div></div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Today's Attendance - ${new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
          </div>
          ${records.length > 0 ? `
            <div class="table-container">
              <table class="data-table">
                <thead><tr><th>Employee</th><th>Department</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th></tr></thead>
                <tbody>
                  ${records.map(r => {
                    const emp = r.employeeId || {};
                    return `
                      <tr>
                        <td>${emp.firstName || ''} ${emp.lastName || ''}</td>
                        <td><span class="badge badge-primary">${emp.department || '-'}</span></td>
                        <td>${r.checkIn ? App.formatTime(r.checkIn) : '-'}</td>
                        <td>${r.checkOut ? App.formatTime(r.checkOut) : '-'}</td>
                        <td>${r.hoursWorked ? r.hoursWorked.toFixed(1) + 'h' : '-'}</td>
                        <td>${App.getStatusBadge(r.status)}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div class="empty-state"><p>No attendance records for today</p></div>'}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  },

  async checkIn() {
    try {
      await AttendanceAPI.checkIn();
      App.showToast('Checked in successfully! ⏰', 'success');
      this.loadTab();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async checkOut() {
    try {
      await AttendanceAPI.checkOut();
      App.showToast('Checked out! 👋', 'success');
      this.loadTab();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  historyPage(page) {
    // Simple reload with page param
    AttendancePage.currentTab = 'history';
    AttendancePage.loadTab();
  }
};
