// ═══════════════════════════════════════════════════════════════
// Employee Detail Page
// ═══════════════════════════════════════════════════════════════

const EmployeeDetailPage = {
  async render(id) {
    const content = document.getElementById('page-content');

    try {
      const data = await EmployeeAPI.getById(id);
      const emp = data.employee;
      const name = `${emp.firstName} ${emp.lastName}`;
      const initials = `${(emp.firstName||'')[0]}${(emp.lastName||'')[0]}`.toUpperCase();

      content.innerHTML = `
        <div class="fade-in-up">
          <button class="btn btn-ghost mb-2" onclick="App.navigate('employees')">← Back to Employees</button>

          <div class="card mb-2">
            <div class="profile-header">
              <div class="profile-avatar">${initials}</div>
              <div>
                <div class="profile-name">${name}</div>
                <div class="profile-title">${emp.position} · ${emp.department}</div>
                <div class="mt-1">${App.getStatusBadge(emp.status)}</div>
              </div>
              <div style="margin-left:auto;display:flex;gap:0.5rem">
                <button class="btn btn-primary btn-sm" onclick="App.navigate('employee-form', '${emp._id || emp.id}')">✏️ Edit</button>
              </div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <label>Email</label>
              <div class="info-value">${emp.email}</div>
            </div>
            <div class="info-item">
              <label>Phone</label>
              <div class="info-value">${emp.phone || 'Not provided'}</div>
            </div>
            <div class="info-item">
              <label>Department</label>
              <div class="info-value">${emp.department}</div>
            </div>
            <div class="info-item">
              <label>Position</label>
              <div class="info-value">${emp.position}</div>
            </div>
            <div class="info-item">
              <label>Salary</label>
              <div class="info-value">${App.formatCurrency(emp.salary)}</div>
            </div>
            <div class="info-item">
              <label>Date of Joining</label>
              <div class="info-value">${App.formatDate(emp.dateOfJoining)}</div>
            </div>
            <div class="info-item">
              <label>Address</label>
              <div class="info-value">${emp.address || 'Not provided'}</div>
            </div>
            <div class="info-item">
              <label>Status</label>
              <div class="info-value">${App.getStatusBadge(emp.status)}</div>
            </div>
          </div>

          <!-- Documents Section -->
          <div class="card mt-2">
            <div class="card-header">
              <h3>📄 Documents</h3>
              <button class="btn btn-primary btn-sm" onclick="DocumentsPage.showUploadModal('${emp._id || emp.id}')">Upload</button>
            </div>
            <div id="emp-documents">
              <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
          </div>
        </div>
      `;

      // Load documents
      this.loadDocuments(emp._id || emp.id);
    } catch (err) {
      content.innerHTML = `
        <button class="btn btn-ghost mb-2" onclick="App.navigate('employees')">← Back</button>
        <div class="alert alert-error">Failed to load employee: ${err.message}</div>
      `;
    }
  },

  async loadDocuments(employeeId) {
    const container = document.getElementById('emp-documents');
    try {
      const data = await DocumentAPI.getAll({ employeeId });
      const docs = data.documents || [];

      if (docs.length === 0) {
        container.innerHTML = '<div class="empty-state"><p class="text-sm">No documents uploaded yet</p></div>';
        return;
      }

      container.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Type</th><th>File</th><th>Uploaded</th><th>Actions</th></tr></thead>
            <tbody>
              ${docs.map(doc => `
                <tr>
                  <td>${doc.name}</td>
                  <td><span class="badge badge-info">${doc.type}</span></td>
                  <td class="text-sm text-muted">${doc.fileName}</td>
                  <td class="text-sm text-muted">${App.formatDate(doc.createdAt)}</td>
                  <td>
                    <div style="display:flex;gap:0.3rem">
                      <button class="btn btn-ghost btn-sm" onclick="DocumentsPage.downloadDoc('${doc._id || doc.id}', '${doc.fileName}')">⬇️</button>
                      ${App.isAdminOrHR() ? `<button class="btn btn-ghost btn-sm" onclick="DocumentsPage.deleteDoc('${doc._id || doc.id}')">🗑️</button>` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  }
};
