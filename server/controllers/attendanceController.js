const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');

// Helper: get start of day
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── POST /api/attendance/check-in ──────────────────────────
exports.checkIn = async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'No employee profile linked to this account.' });
    }

    const today = startOfDay(new Date());
    let attendance = await Attendance.findOne({ employeeId, date: today });

    if (attendance && attendance.checkIn) {
      return res.status(400).json({ error: 'You have already checked in today.', attendance });
    }

    const now = new Date();
    const nineAM = new Date(today);
    nineAM.setHours(9, 0, 0, 0);

    const status = now > nineAM ? 'late' : 'present';

    if (!attendance) {
      attendance = await Attendance.create({
        employeeId,
        date: today,
        checkIn: now,
        status
      });
    } else {
      attendance.checkIn = now;
      attendance.status = status;
      await attendance.save();
    }

    res.json({ message: `Checked in at ${now.toLocaleTimeString()}`, attendance });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: 'Failed to check in.' });
  }
};

// ─── POST /api/attendance/check-out ─────────────────────────
exports.checkOut = async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'No employee profile linked to this account.' });
    }

    const today = startOfDay(new Date());
    const attendance = await Attendance.findOne({ employeeId, date: today });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ error: 'You have not checked in today.' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ error: 'You have already checked out today.', attendance });
    }

    const now = new Date();
    attendance.checkOut = now;

    // Calculate hours worked
    const diffMs = now - attendance.checkIn;
    attendance.hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

    // If less than 4 hours, mark as half-day
    if (attendance.hoursWorked < 4) {
      attendance.status = 'half-day';
    }

    await attendance.save();

    res.json({ message: `Checked out at ${now.toLocaleTimeString()}. Hours: ${attendance.hoursWorked}`, attendance });
  } catch (err) {
    console.error('Check-out error:', err);
    res.status(500).json({ error: 'Failed to check out.' });
  }
};

// ─── GET /api/attendance/today ──────────────────────────────
exports.getToday = async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.json({ attendance: null });
    }

    const today = startOfDay(new Date());
    const attendance = await Attendance.findOne({ employeeId, date: today });

    res.json({ attendance: attendance || null });
  } catch (err) {
    console.error('Get today attendance error:', err);
    res.status(500).json({ error: 'Failed to fetch today attendance.' });
  }
};

// ─── GET /api/attendance/my-history ─────────────────────────
exports.getMyHistory = async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.json({ records: [], total: 0 });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { employeeId };

    if (req.query.month && req.query.year) {
      const month = parseInt(req.query.month) - 1;
      const year = parseInt(req.query.year);
      filter.date = {
        $gte: new Date(year, month, 1),
        $lt: new Date(year, month + 1, 1)
      };
    }

    const total = await Attendance.countDocuments(filter);
    const records = await Attendance.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ records, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get my history error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance history.' });
  }
};

// ─── GET /api/attendance/all (admin/HR) ─────────────────────
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.date) {
      filter.date = startOfDay(new Date(req.query.date));
    }

    if (req.query.employeeId) {
      filter.employeeId = req.query.employeeId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const total = await Attendance.countDocuments(filter);
    const records = await Attendance.find(filter)
      .populate('employeeId', 'firstName lastName email department')
      .sort({ date: -1, checkIn: -1 })
      .skip(skip)
      .limit(limit);

    // Today summary
    const today = startOfDay(new Date());
    const todayRecords = await Attendance.find({ date: today });
    const totalEmployees = await Employee.countDocuments({ status: 'active' });

    const summary = {
      totalPresent: todayRecords.filter(r => ['present', 'late'].includes(r.status)).length,
      totalLate: todayRecords.filter(r => r.status === 'late').length,
      totalAbsent: totalEmployees - todayRecords.length,
      totalOnLeave: todayRecords.filter(r => r.status === 'on-leave').length,
      totalEmployees
    };

    res.json({ records, total, page, pages: Math.ceil(total / limit), summary });
  } catch (err) {
    console.error('Get all attendance error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance records.' });
  }
};

// ─── POST /api/attendance/mark (admin/HR) ───────────────────
exports.markAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, notes } = req.body;

    if (!employeeId || !date || !status) {
      return res.status(400).json({ error: 'Employee ID, date, and status are required.' });
    }

    const dayDate = startOfDay(new Date(date));

    let attendance = await Attendance.findOne({ employeeId, date: dayDate });
    if (attendance) {
      attendance.status = status;
      attendance.notes = notes || attendance.notes;
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        employeeId,
        date: dayDate,
        status,
        notes: notes || ''
      });
    }

    res.json({ message: 'Attendance marked successfully.', attendance });
  } catch (err) {
    console.error('Mark attendance error:', err);
    res.status(500).json({ error: 'Failed to mark attendance.' });
  }
};

// ─── GET /api/attendance/summary ────────────────────────────
exports.getSummary = async (req, res) => {
  try {
    const employeeId = req.query.employeeId || req.user.employeeId;
    if (!employeeId) {
      return res.json({ summary: {} });
    }

    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // last day of month

    const records = await Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate }
    });

    const summary = {
      month, year,
      totalDays: endDate.getDate(),
      present: records.filter(r => r.status === 'present').length,
      late: records.filter(r => r.status === 'late').length,
      absent: 0,
      halfDay: records.filter(r => r.status === 'half-day').length,
      onLeave: records.filter(r => r.status === 'on-leave').length,
      totalRecords: records.length,
      averageHours: records.length > 0
        ? Math.round((records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0) / records.length) * 100) / 100
        : 0
    };

    // Calculate working days (exclude weekends)
    let workingDays = 0;
    for (let d = new Date(startDate); d <= endDate && d <= new Date(); d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) workingDays++;
    }
    summary.workingDays = workingDays;
    summary.absent = Math.max(0, workingDays - summary.totalRecords);

    res.json({ summary });
  } catch (err) {
    console.error('Get summary error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance summary.' });
  }
};
