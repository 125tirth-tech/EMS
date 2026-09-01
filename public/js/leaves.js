// ═══════════════════════════════════════════════════════════════
// Leaves Page - Leave Management
// ═══════════════════════════════════════════════════════════════

const LeavesPage = {
  currentTab: 'my-leaves',

  async render() {
    const content = document.getElementById('page-content');
    const isAdmin = App.isAdminOrHR();

    this.currentTab = isAdmin ? 'all' : 'my-leaves';

    content.innerHTML = `
      <div class="fade-in-up">
        <div class="flex-between mb-2">
          <div class="tabs">
            ${isAdmin ? `<button class="tab active" onclick="LeavesPage.switchTab('all')">All Requests</button>` : ''}
            <button class="tab ${!isAdmin ? 'active' : ''}" onclick="LeavesPage.switchTab('my-leaves')">My Leaves</button>
          </div>
          <button class="btn btn-primary" onclick="LeavesPage.showApplyModal()">🏖️ Apply Leave</button>
        </div>
        <div id="leaves-content">
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
    const container = document.getElementById('leaves-content');
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    if (this.currentTab === 'all') await this.renderAll(container);
    else await this.renderMyLeaves(container);
  },

  async renderMyLeaves(container) {
    try {
      const data = await LeaveAPI.getMyLeaves({ limit: 20 });
      const leaves = data.leaves || [];
      const balance = data.balance || {};

      container.innerHTML = `
        <!-- Leave Balance -->
        <div class="leave-balance-grid mb-2">
          ${this.renderBalance(balance)}
        </div>

        <div class="card">
          <div class="card-header"><h3>My Leave Requests</h3></div>
          ${leaves.length > 0 ? `
            <div class="table-container">
              <table class="data-table">
                <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  ${leaves.map(l => `
                    <tr>
                      <td><span class="badge badge-info">${l.type}</span></td>
                      <td class="text-sm">${App.formatDate(l.startDate)}</td>
                      <td class="text-sm">${App.formatDate(l.endDate)}</td>
                      <td>${l.days}</td>
                      <td class="text-sm truncate" style="max-width:200px" title="${l.reason}">${l.reason}</td>
                      <td>${App.getStatusBadge(l.status)}</td>
                      <td>
                        ${l.status === 'pending' ? `<button class="btn btn-danger btn-sm" onclick="LeavesPage.cancelLeave('${l._id || l.id}')">Cancel</button>` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div class="empty-state"><div class="empty-icon">🏖️</div><p>No leave requests yet</p></div>'}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  },

  async renderAll(container) {
    try {
      const data = await LeaveAPI.getAll({ limit: 20 });
      const leaves = data.leaves || [];
      const stats = data.stats || {};

      container.innerHTML = `
        <div class="stats-grid mb-2">
          <div class="stat-card warning"><div class="stat-icon">⏳</div><div class="stat-info"><h4>Pending</h4><div class="stat-value">${stats.pending || 0}</div></div></div>
          <div class="stat-card success"><div class="stat-icon">✓</div><div class="stat-info"><h4>Approved</h4><div class="stat-value">${stats.approved || 0}</div></div></div>
          <div class="stat-card danger"><div class="stat-icon">✕</div><div class="stat-info"><h4>Rejected</h4><div class="stat-value">${stats.rejected || 0}</div></div></div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>All Leave Requests</h3>
            <select class="form-control" style="width:150px" onchange="LeavesPage.filterStatus(this.value)">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          ${leaves.length > 0 ? `
            <div class="table-container">
              <table class="data-table">
                <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${leaves.map(l => {
                    const emp = l.employeeId || {};
                    return `
                      <tr>
                        <td class="text-sm">${emp.firstName || ''} ${emp.lastName || ''}</td>
                        <td><span class="badge badge-info">${l.type}</span></td>
                        <td class="text-sm">${App.formatDate(l.startDate)}</td>
                        <td class="text-sm">${App.formatDate(l.endDate)}</td>
                        <td>${l.days}</td>
                        <td class="text-sm truncate" style="max-width:150px" title="${l.reason}">${l.reason}</td>
                        <td>${App.getStatusBadge(l.status)}</td>
                        <td>
                          ${l.status === 'pending' ? `
                            <div style="display:flex;gap:0.3rem">
                              <button class="btn btn-success btn-sm" onclick="LeavesPage.approveLeave('${l._id || l.id}')">✓</button>
                              <button class="btn btn-danger btn-sm" onclick="LeavesPage.rejectLeave('${l._id || l.id}')">✕</button>
                            </div>
                          ` : '<span class="text-muted text-sm">-</span>'}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div class="empty-state"><div class="empty-icon">📋</div><p>No leave requests found</p></div>'}
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  },

  renderBalance(balance) {
    const types = {
      sick: { label: 'Sick', color: '#ef4444', icon: '🤒' },
      casual: { label: 'Casual', color: '#f59e0b', icon: '☀️' },
      annual: { label: 'Annual', color: '#6366f1', icon: '🌴' },
      unpaid: { label: 'Unpaid', color: '#64748b', icon: '📝' }
    };

    return Object.entries(types).map(([key, info]) => {
      const b = balance[key] || { total: 0, used: 0, remaining: 0 };
      const pct = b.total > 0 ? Math.min((b.used / b.total) * 100, 100) : 0;
      return `
        <div class="leave-balance-card">
          <div class="lb-type">${info.icon} ${info.label}</div>
          <div class="lb-count" style="color:${info.color}">${b.remaining}</div>
          <div class="lb-detail">${b.used} used / ${b.total} total</div>
          <div class="leave-progress">
            <div class="leave-progress-bar" style="width:${pct}%;background:${info.color}"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  showApplyModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'leave-modal';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>🏖️ Apply for Leave</h3>
          <button class="modal-close" onclick="document.getElementById('leave-modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <form onsubmit="LeavesPage.submitLeave(event)">
            <div class="form-group">
              <label>Leave Type</label>
              <select id="leave-type" class="form-control" required>
                <option value="">Select type</option>
                <option value="sick">Sick Leave</option>
                <option value="casual">Casual Leave</option>
                <option value="annual">Annual Leave</option>
                <option value="maternity">Maternity Leave</option>
                <option value="paternity">Paternity Leave</option>
                <option value="unpaid">Unpaid Leave</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Start Date</label>
                <input type="date" id="leave-start" class="form-control" required>
              </div>
              <div class="form-group">
                <label>End Date</label>
                <input type="date" id="leave-end" class="form-control" required>
              </div>
            </div>
            <div class="form-group">
              <label>Reason</label>
              <textarea id="leave-reason" class="form-control" placeholder="Provide a reason for your leave" required></textarea>
            </div>
            <div class="modal-footer" style="padding:0;border:0;margin-top:1rem">
              <button type="button" class="btn btn-ghost" onclick="document.getElementById('leave-modal').remove()">Cancel</button>
              <button type="submit" class="btn btn-primary" id="leave-submit-btn">Submit Request</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  async submitLeave(e) {
    e.preventDefault();
    const btn = document.getElementById('leave-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
      await LeaveAPI.apply({
        type: document.getElementById('leave-type').value,
        startDate: document.getElementById('leave-start').value,
        endDate: document.getElementById('leave-end').value,
        reason: document.getElementById('leave-reason').value.trim()
      });

      document.getElementById('leave-modal').remove();
      App.showToast('Leave request submitted! 🏖️', 'success');
      this.loadTab();
    } catch (err) {
      App.showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Submit Request';
    }
  },

  async approveLeave(id) {
    if (!confirm('Approve this leave request?')) return;
    try {
      await LeaveAPI.approve(id, {});
      App.showToast('Leave approved ✓', 'success');
      if (this.currentTab) this.loadTab();
      else DashboardPage.render();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async rejectLeave(id) {
    const comment = prompt('Rejection reason (optional):');
    try {
      await LeaveAPI.reject(id, { comment: comment || '' });
      App.showToast('Leave rejected', 'info');
      if (this.currentTab) this.loadTab();
      else DashboardPage.render();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async cancelLeave(id) {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await LeaveAPI.cancel(id);
      App.showToast('Leave cancelled', 'info');
      this.loadTab();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async filterStatus(status) {
    const container = document.getElementById('leaves-content');
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    try {
      const params = { limit: 20 };
      if (status) params.status = status;
      const data = await LeaveAPI.getAll(params);
      // Re-render table only
      this.renderAll(container);
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  }
};
