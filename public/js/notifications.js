// ═══════════════════════════════════════════════════════════════
// Notifications Page - Panel & Management
// ═══════════════════════════════════════════════════════════════

const NotificationsPage = {
  async loadPanel() {
    const list = document.getElementById('notification-list');
    if (!list) return;

    try {
      const data = await NotificationAPI.getAll({ limit: 30 });
      const notifications = data.notifications || [];

      if (notifications.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">🔔</div><p class="text-sm">No notifications</p></div>';
        return;
      }

      list.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}" onclick="NotificationsPage.handleClick('${n._id || n.id}', '${n.link || ''}')">
          <div class="notif-title">${this.getIcon(n.type)} ${n.title}</div>
          <div class="notif-message">${n.message}</div>
          <div class="notif-time">${this.timeAgo(n.createdAt)}</div>
        </div>
      `).join('');
    } catch (err) {
      list.innerHTML = `<div class="alert alert-error text-sm">${err.message}</div>`;
    }
  },

  getIcon(type) {
    const icons = {
      leave: '🏖️',
      attendance: '⏰',
      payroll: '💰',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      system: '🔔',
      info: 'ℹ️'
    };
    return icons[type] || '🔔';
  },

  timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return App.formatDate(dateStr);
  },

  async handleClick(id, link) {
    try {
      await NotificationAPI.markRead(id);
      App.updateNotificationBadge();
      this.loadPanel();

      if (link) {
        App.toggleNotifications();
        App.navigate(link);
      }
    } catch (e) { /* ignore */ }
  },

  async markAllRead() {
    try {
      await NotificationAPI.markAllRead();
      App.showToast('All notifications marked as read', 'info');
      App.updateNotificationBadge();
      this.loadPanel();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};
