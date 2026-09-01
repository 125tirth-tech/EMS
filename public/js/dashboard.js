// ═══════════════════════════════════════════════════════════════
// Dashboard Page - Analytics & Overview
// ═══════════════════════════════════════════════════════════════

const DashboardPage = {
  async render() {
    const content = document.getElementById('page-content');
    
    try {
      const isAdmin = App.isAdminOrHR();
      
      if (isAdmin) {
        await this.renderAdminDashboard(content);
      } else {
        await this.renderEmployeeDashboard(content);
      }
    } catch (err) {
      content.innerHTML = `<div class="alert alert-error">Failed to load dashboard: ${err.message}</div>`;
    }
  },

  async renderAdminDashboard(content) {
    // Fetch data in parallel
    const [statsData, leaveData, attendanceData] = await Promise.all([
      EmployeeAPI.getStats().catch(() => ({ stats: {} })),
      LeaveAPI.getAll({ status: 'pending', limit: 5 }).catch(() => ({ leaves: [], stats: {} })),
      AttendanceAPI.getAll({ date: new Date().toISOString().split('T')[0], limit: 5 }).catch(() => ({ records: [], summary: {} }))
    ]);

    const stats = statsData.stats || {};
    const summary = attendanceData.summary || {};
    const leaveStats = leaveData.stats || {};

    content.innerHTML = `
      <div class="fade-in-up">
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card primary">
            <div class="stat-icon">👥</div>
            <div class="stat-info">
              <h4>Total Employees</h4>
              <div class="stat-value">${stats.total || 0}</div>
              <div class="stat-change">${stats.recentHires || 0} hired this month</div>
            </div>
          </div>
          <div class="stat-card success">
            <div class="stat-icon">✓</div>
            <div class="stat-info">
              <h4>Present Today</h4>
              <div class="stat-value">${summary.totalPresent || 0}</div>
              <div class="stat-change">of ${summary.totalEmployees || 0} employees</div>
            </div>
          </div>
          <div class="stat-card warning">
            <div class="stat-icon">📋</div>
            <div class="stat-info">
              <h4>Pending Leaves</h4>
              <div class="stat-value">${leaveStats.pending || 0}</div>
              <div class="stat-change">Awaiting approval</div>
            </div>
          </div>
          <div class="stat-card danger">
            <div class="stat-icon">🚫</div>
            <div class="stat-info">
              <h4>Absent Today</h4>
              <div class="stat-value">${summary.totalAbsent || 0}</div>
              <div class="stat-change">${summary.totalLate || 0} arrived late</div>
            </div>
          </div>
        </div>

        <div class="grid-2">
          <!-- Department Distribution -->
          <div class="card">
            <div class="card-header">
              <h3>Department Distribution</h3>
            </div>
            <div class="chart-container" id="dept-chart"></div>
          </div>

          <!-- Employee Status -->
          <div class="card">
            <div class="card-header">
              <h3>Employee Status</h3>
            </div>
            <div id="status-chart"></div>
          </div>
        </div>

        <div class="grid-2 mt-2">
          <!-- Pending Leave Requests -->
          <div class="card">
            <div class="card-header">
              <h3>Pending Leave Requests</h3>
              <button class="btn btn-ghost btn-sm" onclick="App.navigate('leaves')">View All →</button>
            </div>
            ${this.renderPendingLeaves(leaveData.leaves || [])}
          </div>

          <!-- Today's Attendance -->
          <div class="card">
            <div class="card-header">
              <h3>Today's Attendance</h3>
              <button class="btn btn-ghost btn-sm" onclick="App.navigate('attendance')">View All →</button>
            </div>
            ${this.renderTodayAttendance(attendanceData.records || [])}
          </div>
        </div>
      </div>
    `;

    // Render charts
    this.renderDeptChart(stats.departments || {});
    this.renderStatusDonut(stats);
  },

  async renderEmployeeDashboard(content) {
    const [todayData, leavesData, summaryData] = await Promise.all([
      AttendanceAPI.getToday().catch(() => ({ attendance: null })),
      LeaveAPI.getMyLeaves({ limit: 5 }).catch(() => ({ leaves: [], balance: {} })),
      AttendanceAPI.getSummary().catch(() => ({ summary: {} }))
    ]);

    const att = todayData.attendance;
    const summary = summaryData.summary || {};
    const balance = leavesData.balance || {};

    content.innerHTML = `
      <div class="fade-in-up">
        <div class="grid-2">
          <!-- Attendance Clock -->
          <div class="card">
            <div class="attendance-clock">
              <div class="clock-time" id="live-clock"></div>
              <div class="clock-date">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div class="attendance-actions">
                ${!att || !att.checkIn
                  ? '<button class="btn btn-success btn-lg" onclick="DashboardPage.doCheckIn()">⏰ Check In</button>'
                  : !att.checkOut
                    ? '<button class="btn btn-danger btn-lg" onclick="DashboardPage.doCheckOut()">🚪 Check Out</button>'
                    : `<div class="badge badge-success">✓ Day Complete - ${(att.hoursWorked || 0).toFixed(1)}h worked</div>`
                }
              </div>
              ${att ? `
                <div class="grid-2 mt-2">
                  <div class="attendance-status-card">
                    <div class="status-label">Check In</div>
                    <div class="status-time">${att.checkIn ? App.formatTime(att.checkIn) : '--:--'}</div>
                  </div>
                  <div class="attendance-status-card">
                    <div class="status-label">Check Out</div>
                    <div class="status-time">${att.checkOut ? App.formatTime(att.checkOut) : '--:--'}</div>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Monthly Summary -->
          <div class="card">
            <div class="card-header">
              <h3>This Month's Summary</h3>
            </div>
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
                <div class="summary-count" style="color:var(--accent-info)">${summary.onLeave || 0}</div>
                <div class="summary-label">On Leave</div>
              </div>
              <div class="summary-item">
                <div class="summary-count" style="color:var(--accent-primary-light)">${summary.averageHours || 0}h</div>
                <div class="summary-label">Avg Hours</div>
              </div>
              <div class="summary-item">
                <div class="summary-count">${summary.workingDays || 0}</div>
                <div class="summary-label">Working Days</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Leave Balance -->
        <div class="card mt-2">
          <div class="card-header">
            <h3>Leave Balance</h3>
            <button class="btn btn-primary btn-sm" onclick="App.navigate('leaves')">Apply Leave</button>
          </div>
          <div class="leave-balance-grid">
            ${this.renderLeaveBalance(balance)}
          </div>
        </div>

        <!-- Recent Leaves -->
        <div class="card mt-2">
          <div class="card-header">
            <h3>Recent Leave Requests</h3>
          </div>
          ${this.renderRecentLeaves(leavesData.leaves || [])}
        </div>
      </div>
    `;

    this.startClock();
  },

  renderDeptChart(departments) {
    const container = document.getElementById('dept-chart');
    if (!container) return;

    const entries = Object.entries(departments).filter(([, v]) => v > 0);
    if (entries.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No department data available</p></div>';
      return;
    }

    const max = Math.max(...entries.map(([, v]) => v), 1);
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

    container.innerHTML = `
      <div class="chart-bar">
        ${entries.map(([name, count], i) => `
          <div class="chart-bar-item">
            <div class="chart-bar-fill" data-value="${count}" style="height:${(count / max) * 150}px;background:${colors[i % colors.length]}"></div>
            <span class="chart-bar-label">${name.split(' ')[0]}</span>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderStatusDonut(stats) {
    const container = document.getElementById('status-chart');
    if (!container) return;

    const data = [
      { label: 'Active', value: stats.active || 0, color: '#10b981' },
      { label: 'Inactive', value: stats.inactive || 0, color: '#ef4444' },
      { label: 'On Leave', value: stats.onLeave || 0, color: '#f59e0b' }
    ].filter(d => d.value > 0);

    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    let cumulative = 0;

    const segments = data.map(d => {
      const start = cumulative;
      cumulative += (d.value / total) * 100;
      return { ...d, start, end: cumulative };
    });

    // Build conic gradient
    let gradient = 'conic-gradient(';
    segments.forEach((s, i) => {
      gradient += `${s.color} ${s.start}% ${s.end}%`;
      if (i < segments.length - 1) gradient += ', ';
    });
    gradient += ')';

    container.innerHTML = `
      <div class="donut-chart">
        <div style="width:120px;height:120px;border-radius:50%;background:${gradient};position:relative;display:flex;align-items:center;justify-content:center">
          <div style="width:70px;height:70px;border-radius:50%;background:var(--bg-card);display:flex;align-items:center;justify-content:center;flex-direction:column">
            <div style="font-size:1.3rem;font-weight:800">${total}</div>
            <div style="font-size:0.6rem;color:var(--text-muted)">Total</div>
          </div>
        </div>
        <div class="donut-legend">
          ${data.map(d => `
            <div class="donut-legend-item">
              <div class="donut-legend-dot" style="background:${d.color}"></div>
              <span>${d.label}: <strong>${d.value}</strong></span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderPendingLeaves(leaves) {
    if (leaves.length === 0) {
      return '<div class="empty-state"><div class="empty-icon">✅</div><p>No pending leave requests</p></div>';
    }

    return `
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Action</th></tr></thead>
          <tbody>
            ${leaves.map(l => {
              const emp = l.employeeId || {};
              return `
                <tr>
                  <td>${emp.firstName || ''} ${emp.lastName || ''}</td>
                  <td><span class="badge badge-info">${l.type}</span></td>
                  <td class="text-sm">${App.formatDate(l.startDate)} - ${App.formatDate(l.endDate)}</td>
                  <td>
                    <div style="display:flex;gap:0.3rem">
                      <button class="btn btn-success btn-sm" onclick="LeavesPage.approveLeave('${l._id || l.id}')">✓</button>
                      <button class="btn btn-danger btn-sm" onclick="LeavesPage.rejectLeave('${l._id || l.id}')">✕</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderTodayAttendance(records) {
    if (records.length === 0) {
      return '<div class="empty-state"><div class="empty-icon">📋</div><p>No attendance records for today</p></div>';
    }

    return `
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Employee</th><th>Check In</th><th>Check Out</th><th>Status</th></tr></thead>
          <tbody>
            ${records.slice(0, 5).map(r => {
              const emp = r.employeeId || {};
              return `
                <tr>
                  <td>${emp.firstName || ''} ${emp.lastName || ''}</td>
                  <td>${r.checkIn ? App.formatTime(r.checkIn) : '-'}</td>
                  <td>${r.checkOut ? App.formatTime(r.checkOut) : '-'}</td>
                  <td>${App.getStatusBadge(r.status)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderLeaveBalance(balance) {
    if (!balance || Object.keys(balance).length === 0) {
      return '<p class="text-muted text-sm">No leave balance data</p>';
    }

    const types = {
      sick: { label: 'Sick Leave', color: '#ef4444' },
      casual: { label: 'Casual Leave', color: '#f59e0b' },
      annual: { label: 'Annual Leave', color: '#6366f1' },
      unpaid: { label: 'Unpaid Leave', color: '#64748b' }
    };

    return Object.entries(types).map(([key, info]) => {
      const b = balance[key] || { total: 0, used: 0, remaining: 0 };
      const pct = b.total > 0 ? (b.used / b.total) * 100 : 0;
      return `
        <div class="leave-balance-card">
          <div class="lb-type">${info.label}</div>
          <div class="lb-count">${b.remaining}</div>
          <div class="lb-detail">of ${b.total} remaining</div>
          <div class="leave-progress">
            <div class="leave-progress-bar" style="width:${pct}%;background:${info.color}"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderRecentLeaves(leaves) {
    if (leaves.length === 0) {
      return '<div class="empty-state"><p class="text-sm">No leave requests yet</p></div>';
    }

    return `
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th></tr></thead>
          <tbody>
            ${leaves.map(l => `
              <tr>
                <td><span class="badge badge-info">${l.type}</span></td>
                <td class="text-sm">${App.formatDate(l.startDate)} - ${App.formatDate(l.endDate)}</td>
                <td>${l.days}</td>
                <td>${App.getStatusBadge(l.status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  startClock() {
    const el = document.getElementById('live-clock');
    if (!el) return;
    const update = () => {
      if (!document.getElementById('live-clock')) return;
      el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      requestAnimationFrame(update);
    };
    update();
  },

  async doCheckIn() {
    try {
      await AttendanceAPI.checkIn();
      App.showToast('Checked in successfully! ⏰', 'success');
      this.render();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async doCheckOut() {
    try {
      await AttendanceAPI.checkOut();
      App.showToast('Checked out! Have a good day! 👋', 'success');
      this.render();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};
