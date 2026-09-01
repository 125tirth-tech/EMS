const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const User = require('../models/User');

// ─── POST /api/leaves/apply ─────────────────────────────────
exports.apply = async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'No employee profile linked to this account.' });
    }

    const { type, startDate, endDate, reason } = req.body;

    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'Type, start date, end date, and reason are required.' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'Start date must be before or equal to end date.' });
    }

    // Check for overlapping leaves
    const overlap = await Leave.findOne({
      employeeId,
      status: { $ne: 'rejected' },
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
      ]
    });

    if (overlap) {
      return res.status(400).json({ error: 'You already have a leave request for overlapping dates.' });
    }

    const leave = await Leave.create({
      employeeId,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason
    });

    // Notify all HR/admin users
    const employee = await Employee.findById(employeeId);
    const admins = await User.find({ role: { $in: ['admin', 'hr'] } });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'New Leave Request',
        message: `${employee ? employee.firstName + ' ' + employee.lastName : 'An employee'} has requested ${type} leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`,
        type: 'leave',
        link: 'leaves'
      });
    }

    res.status(201).json({ message: 'Leave request submitted.', leave });
  } catch (err) {
    console.error('Leave apply error:', err);
    res.status(500).json({ error: 'Failed to submit leave request.' });
  }
};

// ─── GET /api/leaves/my-leaves ──────────────────────────────
exports.getMyLeaves = async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.json({ leaves: [], total: 0 });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { employeeId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;

    const total = await Leave.countDocuments(filter);
    const leaves = await Leave.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Leave balance (annual limits)
    const year = new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const approvedLeaves = await Leave.find({
      employeeId,
      status: 'approved',
      startDate: { $gte: yearStart, $lte: yearEnd }
    });

    const balance = {
      sick: { total: 12, used: 0 },
      casual: { total: 12, used: 0 },
      annual: { total: 15, used: 0 },
      maternity: { total: 180, used: 0 },
      paternity: { total: 15, used: 0 },
      unpaid: { total: 999, used: 0 }
    };

    approvedLeaves.forEach(l => {
      if (balance[l.type]) {
        balance[l.type].used += l.days;
      }
    });

    Object.keys(balance).forEach(k => {
      balance[k].remaining = Math.max(0, balance[k].total - balance[k].used);
    });

    res.json({ leaves, total, page, pages: Math.ceil(total / limit), balance });
  } catch (err) {
    console.error('Get my leaves error:', err);
    res.status(500).json({ error: 'Failed to fetch leaves.' });
  }
};

// ─── GET /api/leaves/all (admin/HR) ─────────────────────────
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;

    const total = await Leave.countDocuments(filter);
    const leaves = await Leave.find(filter)
      .populate('employeeId', 'firstName lastName email department position')
      .populate('approvedBy', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Count by status
    const stats = {
      pending: await Leave.countDocuments({ status: 'pending' }),
      approved: await Leave.countDocuments({ status: 'approved' }),
      rejected: await Leave.countDocuments({ status: 'rejected' })
    };

    res.json({ leaves, total, page, pages: Math.ceil(total / limit), stats });
  } catch (err) {
    console.error('Get all leaves error:', err);
    res.status(500).json({ error: 'Failed to fetch leave requests.' });
  }
};

// ─── PUT /api/leaves/:id/approve ────────────────────────────
exports.approve = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ error: `Leave request is already ${leave.status}.` });
    }

    leave.status = 'approved';
    leave.approvedBy = req.user.id;
    leave.approverComment = req.body.comment || '';
    await leave.save();

    // Notify the employee
    const empUser = await User.findOne({ employeeId: leave.employeeId });
    if (empUser) {
      await Notification.create({
        userId: empUser._id,
        title: 'Leave Approved',
        message: `Your ${leave.type} leave from ${leave.startDate.toLocaleDateString()} to ${leave.endDate.toLocaleDateString()} has been approved.`,
        type: 'leave',
        link: 'leaves'
      });
    }

    res.json({ message: 'Leave approved.', leave });
  } catch (err) {
    console.error('Approve leave error:', err);
    res.status(500).json({ error: 'Failed to approve leave.' });
  }
};

// ─── PUT /api/leaves/:id/reject ─────────────────────────────
exports.reject = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ error: `Leave request is already ${leave.status}.` });
    }

    leave.status = 'rejected';
    leave.approvedBy = req.user.id;
    leave.approverComment = req.body.comment || '';
    await leave.save();

    // Notify the employee
    const empUser = await User.findOne({ employeeId: leave.employeeId });
    if (empUser) {
      await Notification.create({
        userId: empUser._id,
        title: 'Leave Rejected',
        message: `Your ${leave.type} leave from ${leave.startDate.toLocaleDateString()} to ${leave.endDate.toLocaleDateString()} has been rejected.${req.body.comment ? ' Reason: ' + req.body.comment : ''}`,
        type: 'leave',
        link: 'leaves'
      });
    }

    res.json({ message: 'Leave rejected.', leave });
  } catch (err) {
    console.error('Reject leave error:', err);
    res.status(500).json({ error: 'Failed to reject leave.' });
  }
};

// ─── DELETE /api/leaves/:id ─────────────────────────────────
exports.cancel = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    // Employees can only cancel their own pending leaves
    if (req.user.role === 'employee') {
      if (leave.employeeId.toString() !== req.user.employeeId) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      if (leave.status !== 'pending') {
        return res.status(400).json({ error: 'Can only cancel pending leave requests.' });
      }
    }

    await Leave.findByIdAndDelete(req.params.id);
    res.json({ message: 'Leave request cancelled.' });
  } catch (err) {
    console.error('Cancel leave error:', err);
    res.status(500).json({ error: 'Failed to cancel leave request.' });
  }
};
