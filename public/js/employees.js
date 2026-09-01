// ═══════════════════════════════════════════════════════════════
// Employees Page - List, Search, Filter
// ═══════════════════════════════════════════════════════════════

const EmployeesPage = {
  currentPage: 1,
  filters: { search: '', department: '', status: '' },

  async render(page) {
    this.currentPage = page || 1;
    const content = document.getElementById('page-content');

    try {
      const params = {
        page: this.currentPage,
        limit: 10,
        ...(this.filters.search && { search: this.filters.search }),
        ...(this.filters.department && { department: this.filters.department }),
        ...(this.filters.status && { status: this.filters.status })
      };

      const data = await EmployeeAPI.getAll(params);
      let depts = [];
      try {
        const deptData = await EmployeeAPI.getDepartments();
        depts = deptData.departments || [];
      } catch(e) {}

      content.innerHTML = `
        <div class="fade-in-up">
          <div class="toolbar">
            <div class="search-input">
              <input type="text" placeholder="Search employees..." value="${this.filters.search}"
                oninput="EmployeesPage.onSearch(this.value)" id="emp-search">
            </div>
            <select class="form-control filter-select" onchange="EmployeesPage.onFilter('department', this.value)" id="emp-dept-filter">
              <option value="">All Departments</option>
              ${depts.map(d => `<option value="${d}" ${this.filters.department === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
            <select class="form-control filter-select" onchange="EmployeesPage.onFilter('status', this.value)" id="emp-status-filter">
              <option value="">All Statuses</option>
              <option value="active" ${this.filters.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="inactive" ${this.filters.status === 'inactive' ? 'selected' : ''}>Inactive</option>
              <option value="on-leave" ${this.filters.status === 'on-leave' ? 'selected' : ''}>On Leave</option>
            </select>
            <button class="btn btn-primary" onclick="App.navigate('employee-form')">➕ Add Employee</button>
          </div>

          <div class="card">
            <div class="card-header">
              <h3>All Employees (${data.total || 0})</h3>
            </div>
            ${data.employees && data.employees.length > 0 ? `
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Position</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.employees.map(emp => this.renderRow(emp)).join('')}
                  </tbody>
                </table>
              </div>
              ${App.renderPagination(data.page, data.pages, 'EmployeesPage.goToPage')}
            ` : `
              <div class="empty-state">
                <div class="empty-icon">👥</div>
                <h3>No employees found</h3>
                <p>Try adjusting your search filters or add a new employee.</p>
              </div>
            `}
          </div>
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div class="alert alert-error">Failed to load employees: ${err.message}</div>`;
    }
  },

  renderRow(emp) {
    const name = `${emp.firstName} ${emp.lastName}`;
    const color = App.getAvatarColor(name);
    const initials = `${(emp.firstName||'')[0] || ''}${(emp.lastName||'')[0] || ''}`.toUpperCase();

    return `
      <tr>
        <td>
          <div class="employee-info">
            <div class="employee-avatar" style="background:${color}">${initials}</div>
            <div>
              <div class="name">${name}</div>
              <div class="email">${emp.email}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-primary">${emp.department}</span></td>
        <td>${emp.position}</td>
        <td>${App.getStatusBadge(emp.status)}</td>
        <td class="text-sm text-muted">${App.formatDate(emp.dateOfJoining)}</td>
        <td>
          <div style="display:flex;gap:0.3rem">
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('employee-detail', '${emp._id || emp.id}')">👁️</button>
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('employee-form', '${emp._id || emp.id}')">✏️</button>
            ${App.user.role === 'admin' ? `<button class="btn btn-ghost btn-sm" onclick="EmployeesPage.deleteEmployee('${emp._id || emp.id}', '${name}')">🗑️</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  },

  _searchTimeout: null,
  onSearch(value) {
    clearTimeout(this._searchTimeout);
    this._searchTimeout = setTimeout(() => {
      this.filters.search = value;
      this.render(1);
    }, 400);
  },

  onFilter(key, value) {
    this.filters[key] = value;
    this.render(1);
  },

  goToPage(page) {
    this.render(page);
  },

  async deleteEmployee(id, name) {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
    try {
      await EmployeeAPI.delete(id);
      App.showToast(`${name} deleted successfully`, 'success');
      this.render(this.currentPage);
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};
