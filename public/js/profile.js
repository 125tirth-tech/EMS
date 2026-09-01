// Profile Page - Employee self-view
const ProfilePage = {
  async render() {
    const content = document.getElementById('page-content');
    if (!App.user.employeeId) {
      content.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-icon">👤</div><h3>No Profile Linked</h3><p>Your account is not linked to an employee profile.</p></div></div>`;
      return;
    }
    try {
      const data = await EmployeeAPI.getById(App.user.employeeId);
      const emp = data.employee;
      const name = `${emp.firstName} ${emp.lastName}`;
      const initials = `${(emp.firstName||'')[0]}${(emp.lastName||'')[0]}`.toUpperCase();
      content.innerHTML = `<div class="fade-in-up">
        <div class="card mb-2">
          <div class="profile-header">
            <div class="profile-avatar">${initials}</div>
            <div><div class="profile-name">${name}</div>
              <div class="profile-title">${emp.position} · ${emp.department}</div>
              <div class="mt-1">${App.getStatusBadge(emp.status)}</div></div>
          </div>
        </div>
        <div class="info-grid">
          <div class="info-item"><label>Email</label><div class="info-value">${emp.email}</div></div>
          <div class="info-item"><label>Phone</label><div class="info-value">${emp.phone||'N/A'}</div></div>
          <div class="info-item"><label>Department</label><div class="info-value">${emp.department}</div></div>
          <div class="info-item"><label>Position</label><div class="info-value">${emp.position}</div></div>
          <div class="info-item"><label>Salary</label><div class="info-value">${App.formatCurrency(emp.salary)}</div></div>
          <div class="info-item"><label>Joined</label><div class="info-value">${App.formatDate(emp.dateOfJoining)}</div></div>
          <div class="info-item"><label>Address</label><div class="info-value">${emp.address||'N/A'}</div></div>
          <div class="info-item"><label>Status</label><div class="info-value">${App.getStatusBadge(emp.status)}</div></div>
        </div></div>`;
    } catch(err) {
      content.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  }
};
