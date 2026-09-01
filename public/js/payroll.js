// ═══════════════════════════════════════════════════════════════
// Payroll Page
// ═══════════════════════════════════════════════════════════════

const PayrollPage = {
  async render() {
    const content = document.getElementById('page-content');
    const isAdmin = App.isAdminOrHR();

    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const data = await PayrollAPI.getAll({ month, year, limit: 50 });
      const payrolls = data.payrolls || [];
      const stats = data.stats || {};

      content.innerHTML = `
        <div class="fade-in-up">
          ${isAdmin ? `
            <div class="flex-between mb-2">
              <div class="flex gap-1">
                <select class="form-control" id="payroll-month" style="width:140px" onchange="PayrollPage.filterPayroll()">
                  ${[...Array(12)].map((_, i) => {
                    const m = i + 1;
                    const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                    return `<option value="${m}" ${m === month ? 'selected' : ''}>${labels[i]}</option>`;
                  }).join('')}
                </select>
                <select class="form-control" id="payroll-year" style="width:100px" onchange="PayrollPage.filterPayroll()">
                  ${[year - 1, year, year + 1].map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
              </div>
              <div class="flex gap-1">
                <button class="btn btn-primary" onclick="PayrollPage.showGenerateModal()">💰 Generate Payroll</button>
                <button class="btn btn-success" onclick="PayrollPage.generateAllPayroll()">📊 Generate All</button>
              </div>
            </div>

            <div class="stats-grid mb-2">
              <div class="stat-card primary"><div class="stat-icon">💰</div><div class="stat-info"><h4>Total Payout</h4><div class="stat-value">${App.formatCurrency(stats.totalPayout)}</div></div></div>
              <div class="stat-card info"><div class="stat-icon">📋</div><div class="stat-info"><h4>Records</h4><div class="stat-value">${stats.totalRecords || 0}</div></div></div>
              <div class="stat-card warning"><div class="stat-icon">📝</div><div class="stat-info"><h4>Draft</h4><div class="stat-value">${stats.draft || 0}</div></div></div>
              <div class="stat-card success"><div class="stat-icon">✓</div><div class="stat-info"><h4>Paid</h4><div class="stat-value">${stats.paid || 0}</div></div></div>
            </div>
          ` : ''}

          <div class="card">
            <div class="card-header">
              <h3>Payroll Records</h3>
            </div>
            ${payrolls.length > 0 ? `
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Basic</th>
                      <th>Allowances</th>
                      <th>Deductions</th>
                      <th>Net Pay</th>
                      <th>Status</th>
                      ${isAdmin ? '<th>Actions</th>' : ''}
                    </tr>
                  </thead>
                  <tbody>
                    ${payrolls.map(p => {
                      const emp = p.employeeId || {};
                      return `
                        <tr>
                          <td>
                            <div class="text-sm">
                              <div style="font-weight:600">${emp.firstName || ''} ${emp.lastName || ''}</div>
                              <div class="text-muted">${emp.department || ''}</div>
                            </div>
                          </td>
                          <td>${App.formatCurrency(p.basicSalary)}</td>
                          <td style="color:var(--accent-success)">+${App.formatCurrency(p.totalAllowances)}</td>
                          <td style="color:var(--accent-danger)">-${App.formatCurrency(p.totalDeductions)}</td>
                          <td style="font-weight:700">${App.formatCurrency(p.netPay)}</td>
                          <td>${App.getStatusBadge(p.status)}</td>
                          ${isAdmin ? `
                            <td>
                              <div style="display:flex;gap:0.3rem">
                                ${p.status === 'draft' ? `
                                  <button class="btn btn-success btn-sm" onclick="PayrollPage.updateStatus('${p._id || p.id}', 'processed')">Process</button>
                                ` : p.status === 'processed' ? `
                                  <button class="btn btn-primary btn-sm" onclick="PayrollPage.updateStatus('${p._id || p.id}', 'paid')">Pay</button>
                                ` : '<span class="badge badge-success">Paid</span>'}
                                <button class="btn btn-ghost btn-sm" onclick="PayrollPage.viewDetail('${p._id || p.id}')">👁️</button>
                              </div>
                            </td>
                          ` : ''}
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <div class="empty-state">
                <div class="empty-icon">💰</div>
                <h3>No payroll records</h3>
                <p>${isAdmin ? 'Generate payroll for this month.' : 'No payroll records found for this period.'}</p>
              </div>
            `}
          </div>
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div class="alert alert-error">Failed to load payroll: ${err.message}</div>`;
    }
  },

  async filterPayroll() {
    this.render();
  },

  async updateStatus(id, status) {
    try {
      await PayrollAPI.update(id, { status });
      App.showToast(`Payroll ${status}`, 'success');
      this.render();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async generateAllPayroll() {
    const month = document.getElementById('payroll-month')?.value || (new Date().getMonth() + 1);
    const year = document.getElementById('payroll-year')?.value || new Date().getFullYear();

    if (!confirm(`Generate payroll for all active employees for ${month}/${year}?`)) return;

    try {
      const result = await PayrollAPI.generateAll({ month, year });
      App.showToast(result.message, 'success');
      this.render();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  showGenerateModal() {
    // Simple individual payroll generation
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'payroll-modal';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>💰 Generate Payroll</h3>
          <button class="modal-close" onclick="document.getElementById('payroll-modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <p class="text-sm text-muted mb-2">Use "Generate All" to auto-generate payroll for all active employees. This form is for individual generation with custom values.</p>
          <form onsubmit="PayrollPage.submitPayroll(event)">
            <div class="form-group">
              <label>Employee ID</label>
              <input type="text" id="gen-employeeId" class="form-control" placeholder="Enter Employee ID" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Month</label>
                <input type="number" id="gen-month" class="form-control" min="1" max="12" value="${new Date().getMonth() + 1}" required>
              </div>
              <div class="form-group">
                <label>Year</label>
                <input type="number" id="gen-year" class="form-control" value="${new Date().getFullYear()}" required>
              </div>
            </div>
            <div class="form-group">
              <label>Bonus (optional)</label>
              <input type="number" id="gen-bonus" class="form-control" value="0" min="0">
            </div>
            <div class="modal-footer" style="padding:0;border:0;margin-top:1rem">
              <button type="button" class="btn btn-ghost" onclick="document.getElementById('payroll-modal').remove()">Cancel</button>
              <button type="submit" class="btn btn-primary">Generate</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  async submitPayroll(e) {
    e.preventDefault();
    try {
      await PayrollAPI.generate({
        employeeId: document.getElementById('gen-employeeId').value.trim(),
        month: document.getElementById('gen-month').value,
        year: document.getElementById('gen-year').value,
        bonus: parseFloat(document.getElementById('gen-bonus').value) || 0
      });
      document.getElementById('payroll-modal').remove();
      App.showToast('Payroll generated', 'success');
      this.render();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async viewDetail(id) {
    try {
      const data = await PayrollAPI.getById(id);
      const p = data.payroll;
      const emp = p.employeeId || {};
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'payslip-modal';
      modal.innerHTML = `
        <div class="modal" style="max-width:500px">
          <div class="modal-header">
            <h3>💰 Payslip - ${monthNames[p.month - 1]} ${p.year}</h3>
            <button class="modal-close" onclick="document.getElementById('payslip-modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <div style="margin-bottom:1rem">
              <div style="font-weight:700;font-size:1.1rem">${emp.firstName || ''} ${emp.lastName || ''}</div>
              <div class="text-sm text-muted">${emp.position || ''} · ${emp.department || ''}</div>
            </div>

            <div style="border:1px solid var(--border-color);border-radius:var(--radius-sm);overflow:hidden">
              <div style="padding:0.5rem 1rem;display:flex;justify-content:space-between;border-bottom:1px solid var(--border-color)">
                <span>Basic Salary</span><span style="font-weight:600">${App.formatCurrency(p.basicSalary)}</span>
              </div>
              <div style="padding:0.3rem 1rem;font-size:0.8rem;color:var(--accent-success);border-bottom:1px solid var(--border-color);background:rgba(16,185,129,0.05)">
                <div style="display:flex;justify-content:space-between;padding:0.2rem 0"><span>HRA</span><span>+${App.formatCurrency(p.allowances?.hra)}</span></div>
                <div style="display:flex;justify-content:space-between;padding:0.2rem 0"><span>Transport</span><span>+${App.formatCurrency(p.allowances?.transport)}</span></div>
                <div style="display:flex;justify-content:space-between;padding:0.2rem 0"><span>Medical</span><span>+${App.formatCurrency(p.allowances?.medical)}</span></div>
                <div style="display:flex;justify-content:space-between;padding:0.2rem 0;font-weight:600"><span>Total Allowances</span><span>+${App.formatCurrency(p.totalAllowances)}</span></div>
              </div>
              <div style="padding:0.3rem 1rem;font-size:0.8rem;color:var(--accent-danger);border-bottom:1px solid var(--border-color);background:rgba(239,68,68,0.05)">
                <div style="display:flex;justify-content:space-between;padding:0.2rem 0"><span>Tax</span><span>-${App.formatCurrency(p.deductions?.tax)}</span></div>
                <div style="display:flex;justify-content:space-between;padding:0.2rem 0"><span>Insurance</span><span>-${App.formatCurrency(p.deductions?.insurance)}</span></div>
                <div style="display:flex;justify-content:space-between;padding:0.2rem 0"><span>PF</span><span>-${App.formatCurrency(p.deductions?.pf)}</span></div>
                <div style="display:flex;justify-content:space-between;padding:0.2rem 0;font-weight:600"><span>Total Deductions</span><span>-${App.formatCurrency(p.totalDeductions)}</span></div>
              </div>
              ${p.bonus ? `<div style="padding:0.5rem 1rem;display:flex;justify-content:space-between;border-bottom:1px solid var(--border-color);color:var(--accent-warning)"><span>Bonus</span><span>+${App.formatCurrency(p.bonus)}</span></div>` : ''}
              <div style="padding:0.75rem 1rem;display:flex;justify-content:space-between;font-weight:800;font-size:1.1rem;background:var(--bg-glass)">
                <span>Net Pay</span><span style="color:var(--accent-primary-light)">${App.formatCurrency(p.netPay)}</span>
              </div>
            </div>

            <div class="mt-1 text-center">
              ${App.getStatusBadge(p.status)}
              ${p.paidDate ? `<span class="text-sm text-muted ml-1">Paid on ${App.formatDate(p.paidDate)}</span>` : ''}
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};
