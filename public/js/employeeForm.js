// ═══════════════════════════════════════════════════════════════
// Employee Form Page - Add/Edit
// ═══════════════════════════════════════════════════════════════

const EmployeeFormPage = {
  editId: null,

  async render(id) {
    this.editId = id || null;
    const content = document.getElementById('page-content');
    let emp = {};
    let depts = [];

    try {
      const deptData = await EmployeeAPI.getDepartments();
      depts = deptData.departments || [];

      if (this.editId) {
        const data = await EmployeeAPI.getById(this.editId);
        emp = data.employee || {};
      }
    } catch (err) {
      content.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
      return;
    }

    const isEdit = !!this.editId;
    const joinDate = emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split('T')[0] : '';

    content.innerHTML = `
      <div class="fade-in-up">
        <button class="btn btn-ghost mb-2" onclick="App.navigate('employees')">← Back to Employees</button>

        <div class="card" style="max-width:700px">
          <div class="card-header">
            <h3>${isEdit ? '✏️ Edit Employee' : '➕ Add New Employee'}</h3>
          </div>

          <form onsubmit="EmployeeFormPage.handleSubmit(event)" id="employee-form">
            <div class="form-row">
              <div class="form-group">
                <label for="emp-firstName">First Name *</label>
                <input type="text" id="emp-firstName" class="form-control" value="${emp.firstName || ''}" required>
              </div>
              <div class="form-group">
                <label for="emp-lastName">Last Name *</label>
                <input type="text" id="emp-lastName" class="form-control" value="${emp.lastName || ''}" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="emp-email">Email *</label>
                <input type="email" id="emp-email" class="form-control" value="${emp.email || ''}" required ${isEdit ? 'readonly' : ''}>
              </div>
              <div class="form-group">
                <label for="emp-phone">Phone</label>
                <input type="tel" id="emp-phone" class="form-control" value="${emp.phone || ''}" placeholder="Optional">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="emp-department">Department *</label>
                <select id="emp-department" class="form-control" required>
                  <option value="">Select Department</option>
                  ${depts.map(d => `<option value="${d}" ${emp.department === d ? 'selected' : ''}>${d}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="emp-position">Position *</label>
                <input type="text" id="emp-position" class="form-control" value="${emp.position || ''}" required placeholder="e.g., Software Engineer">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="emp-salary">Salary (₹)</label>
                <input type="number" id="emp-salary" class="form-control" value="${emp.salary || ''}" min="0" placeholder="Monthly salary">
              </div>
              <div class="form-group">
                <label for="emp-dateOfJoining">Date of Joining</label>
                <input type="date" id="emp-dateOfJoining" class="form-control" value="${joinDate}">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="emp-status">Status</label>
                <select id="emp-status" class="form-control">
                  <option value="active" ${emp.status === 'active' ? 'selected' : ''}>Active</option>
                  <option value="inactive" ${emp.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                  <option value="on-leave" ${emp.status === 'on-leave' ? 'selected' : ''}>On Leave</option>
                </select>
              </div>
              <div class="form-group">
                <label for="emp-address">Address</label>
                <input type="text" id="emp-address" class="form-control" value="${emp.address || ''}" placeholder="Optional">
              </div>
            </div>

            <div style="display:flex;gap:0.75rem;margin-top:1.5rem">
              <button type="submit" class="btn btn-primary btn-lg" id="save-btn">
                ${isEdit ? 'Update Employee' : 'Create Employee'}
              </button>
              <button type="button" class="btn btn-ghost btn-lg" onclick="App.navigate('employees')">Cancel</button>
            </div>
          </form>

          <div id="form-result" class="mt-2"></div>
        </div>
      </div>

      <!-- Credentials Modal Overlay -->
      <div class="credentials-modal-overlay" id="credentials-modal" style="display:none">
        <div class="credentials-modal fade-in-up">
          <div class="credentials-modal-header">
            <div class="credentials-icon">🔑</div>
            <h2>Employee Login Credentials</h2>
            <p>Please save or share these credentials with the employee. The temporary password will not be shown again.</p>
          </div>
          <div class="credentials-body">
            <div class="credential-row">
              <div class="credential-label">👤 Username</div>
              <div class="credential-value" id="cred-username">-</div>
              <button class="btn btn-ghost btn-sm" onclick="EmployeeFormPage.copyCredential('cred-username')" title="Copy">📋</button>
            </div>
            <div class="credential-row">
              <div class="credential-label">🔒 Temporary Password</div>
              <div class="credential-value credential-password" id="cred-password">-</div>
              <button class="btn btn-ghost btn-sm" onclick="EmployeeFormPage.copyCredential('cred-password')" title="Copy">📋</button>
            </div>
            <div class="credential-row">
              <div class="credential-label">📧 Email</div>
              <div class="credential-value" id="cred-email">-</div>
              <button class="btn btn-ghost btn-sm" onclick="EmployeeFormPage.copyCredential('cred-email')" title="Copy">📋</button>
            </div>
          </div>
          <div class="credentials-warning">
            <span>⚠️</span>
            <div>
              <strong>Important:</strong> The employee must change this password on their first login. 
              Make sure to save or share these credentials before closing this dialog.
            </div>
          </div>
          <div class="credentials-actions">
            <button class="btn btn-primary btn-lg" onclick="EmployeeFormPage.copyAllCredentials()">
              📋 Copy All Credentials
            </button>
            <button class="btn btn-success btn-lg" onclick="EmployeeFormPage.closeCredentialsModal()">
              ✅ Done - Go to Employees
            </button>
          </div>
        </div>
      </div>
    `;
  },

  showCredentialsModal(credentials, email) {
    document.getElementById('cred-username').textContent = credentials.username;
    document.getElementById('cred-password').textContent = credentials.tempPassword;
    document.getElementById('cred-email').textContent = email;
    document.getElementById('credentials-modal').style.display = 'flex';
  },

  closeCredentialsModal() {
    document.getElementById('credentials-modal').style.display = 'none';
    App.navigate('employees');
  },

  copyCredential(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => {
      App.showToast('Copied to clipboard! 📋', 'success');
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      App.showToast('Copied to clipboard! 📋', 'success');
    });
  },

  copyAllCredentials() {
    const username = document.getElementById('cred-username').textContent;
    const password = document.getElementById('cred-password').textContent;
    const email = document.getElementById('cred-email').textContent;
    const text = `EMS Pro - Employee Login Credentials\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nUsername: ${username}\nTemporary Password: ${password}\nEmail: ${email}\n\n⚠️ Please change your password on first login.`;

    navigator.clipboard.writeText(text).then(() => {
      App.showToast('All credentials copied to clipboard! 📋', 'success');
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      App.showToast('All credentials copied to clipboard! 📋', 'success');
    });
  },

  async handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const body = {
        firstName: document.getElementById('emp-firstName').value.trim(),
        lastName: document.getElementById('emp-lastName').value.trim(),
        email: document.getElementById('emp-email').value.trim(),
        phone: document.getElementById('emp-phone').value.trim(),
        department: document.getElementById('emp-department').value,
        position: document.getElementById('emp-position').value.trim(),
        salary: parseFloat(document.getElementById('emp-salary').value) || 0,
        dateOfJoining: document.getElementById('emp-dateOfJoining').value || undefined,
        status: document.getElementById('emp-status').value,
        address: document.getElementById('emp-address').value.trim()
      };

      if (this.editId) {
        await EmployeeAPI.update(this.editId, body);
        App.showToast('Employee updated successfully! ✅', 'success');
        App.navigate('employee-detail', this.editId);
      } else {
        const result = await EmployeeAPI.create(body);

        // Show credentials modal if new employee created
        if (result.credentials) {
          this.showCredentialsModal(result.credentials, body.email);
          App.showToast('Employee created successfully! 🎉', 'success');
        } else {
          App.showToast('Employee created successfully! 🎉', 'success');
          App.navigate('employees');
        }
      }
    } catch (err) {
      App.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = this.editId ? 'Update Employee' : 'Create Employee';
    }
  }
};
