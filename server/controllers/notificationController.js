const Notification = require('../models/Notification');

// ─── GET /api/notifications ─────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { userId: req.user.id };
    if (req.query.read !== undefined) {
      filter.read = req.query.read === 'true';
    }

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, read: false });

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ notifications, total, unreadCount, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
};

// ─── GET /api/notifications/unread-count ────────────────────
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.id, read: false });
    res.json({ count });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ error: 'Failed to fetch unread count.' });
  }
};

// ─── PUT /api/notifications/:id/read ────────────────────────
exports.markRead = async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    res.json({ notification: notif });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
};

// ─── PUT /api/notifications/read-all ────────────────────────
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
};

// ─── DELETE /api/notifications/:id ──────────────────────────
exports.remove = async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!deleted) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    res.json({ message: 'Notification deleted.' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'Failed to delete notification.' });
  }
};

// ─── POST /api/notifications (admin - send to users) ────────
exports.create = async (req, res) => {
  try {
    const { userId, title, message, type } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'User ID, title, and message are required.' });
    }

    const notif = await Notification.create({
      userId,
      title,
      message,
      type: type || 'info'
    });

    res.status(201).json({ notification: notif });
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({ error: 'Failed to create notification.' });
  }
};
