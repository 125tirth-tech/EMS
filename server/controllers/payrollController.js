const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const User = require('../models/User');

// ─── POST /api/payroll/generate ─────────────────────────────
exports.generate = async (req, res) => {
  try {
    const { employeeId, month, year, allowances, deductions, bonus } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({ error: 'Employee ID, month, and year are required.' });
    }

    // Check if already exists
    const existing = await Payroll.findOne({ employeeId, month, year });
    if (existing) {
      return res.status(409).json({ error: 'Payroll already exists for this employee for the specified month.', payroll: existing });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const payroll = new Payroll({
      employeeId,
      month: parseInt(month),
      year: parseInt(year),
      basicSalary: employee.salary,
      allowances: {
        hra: allowances?.hra || Math.round(employee.salary * 0.2),
        transport: allowances?.transport || Math.round(employee.salary * 0.05),
        medical: allowances?.medical || Math.round(employee.salary * 0.03),
        other: allowances?.other || 0
      },
      deductions: {
        tax: deductions?.tax || Math.round(employee.salary * 0.1),
        insurance: deductions?.insurance || Math.round(employee.salary * 0.02),
        pf: deductions?.pf || Math.round(employee.salary * 0.12),
        other: deductions?.other || 0
      },
      bonus: bonus || 0,
      status: 'draft',
      generatedBy: req.user.id
    });

    await payroll.save();

    res.status(201).json({ message: 'Payroll generated.', payroll });
  } catch (err) {
    console.error('Generate payroll error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Payroll already exists for this month.' });
    }
    res.status(500).json({ error: 'Failed to generate payroll.' });
  }
};

// ─── POST /api/payroll/generate-all ─────────────────────────
exports.generateAll = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required.' });
    }

    const employees = await Employee.find({ status: 'active' });
    let generated = 0;
    let skipped = 0;

    for (const emp of employees) {
      const existing = await Payroll.findOne({ employeeId: emp._id, month: parseInt(month), year: parseInt(year) });
      if (existing) {
        skipped++;
        continue;
      }

      const payroll = new Payroll({
        employeeId: emp._id,
        month: parseInt(month),
        year: parseInt(year),
        basicSalary: emp.salary,
        allowances: {
          hra: Math.round(emp.salary * 0.2),
          transport: Math.round(emp.salary * 0.05),
          medical: Math.round(emp.salary * 0.03),
          other: 0
        },
        deductions: {
          tax: Math.round(emp.salary * 0.1),
          insurance: Math.round(emp.salary * 0.02),
          pf: Math.round(emp.salary * 0.12),
          other: 0
        },
        bonus: 0,
        status: 'draft',
        generatedBy: req.user.id
      });

      await payroll.save();
      generated++;
    }

    res.json({ message: `Payroll generated for ${generated} employees. ${skipped} already existed.`, generated, skipped });
  } catch (err) {
    console.error('Generate all payroll error:', err);
    res.status(500).json({ error: 'Failed to generate payroll.' });
  }
};

// ─── GET /api/payroll ───────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.month) filter.month = parseInt(req.query.month);
    if (req.query.year) filter.year = parseInt(req.query.year);
    if (req.query.status) filter.status = req.query.status;
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;

    // Employees can only see their own
    if (req.user.role === 'employee') {
      filter.employeeId = req.user.employeeId;
    }

    const total = await Payroll.countDocuments(filter);
    const payrolls = await Payroll.find(filter)
      .populate('employeeId', 'firstName lastName email department position')
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(limit);

    // Stats
    const allForPeriod = await Payroll.find(
      req.query.month && req.query.year
        ? { month: parseInt(req.query.month), year: parseInt(req.query.year) }
        : {}
    );

    const stats = {
      totalPayout: allForPeriod.reduce((s, p) => s + p.netPay, 0),
      totalRecords: allForPeriod.length,
      draft: allForPeriod.filter(p => p.status === 'draft').length,
      processed: allForPeriod.filter(p => p.status === 'processed').length,
      paid: allForPeriod.filter(p => p.status === 'paid').length
    };

    res.json({ payrolls, total, page, pages: Math.ceil(total / limit), stats });
  } catch (err) {
    console.error('Get payroll error:', err);
    res.status(500).json({ error: 'Failed to fetch payroll records.' });
  }
};

// ─── PUT /api/payroll/:id ───────────────────────────────────
exports.update = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ error: 'Payroll record not found.' });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({ error: 'Cannot edit a paid payroll record.' });
    }

    const fields = ['basicSalary', 'bonus', 'status', 'allowances', 'deductions'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) payroll[f] = req.body[f];
    });

    if (req.body.status === 'paid') {
      payroll.paidDate = new Date();

      // Notify employee
      const empUser = await User.findOne({ employeeId: payroll.employeeId });
      if (empUser) {
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        await Notification.create({
          userId: empUser._id,
          title: 'Salary Paid',
          message: `Your salary for ${monthNames[payroll.month - 1]} ${payroll.year} has been processed. Net pay: ₹${payroll.netPay.toLocaleString()}`,
          type: 'payroll',
          link: 'payroll'
        });
      }
    }

    await payroll.save();
    res.json({ message: 'Payroll updated.', payroll });
  } catch (err) {
    console.error('Update payroll error:', err);
    res.status(500).json({ error: 'Failed to update payroll.' });
  }
};

// ─── GET /api/payroll/:id ───────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employeeId', 'firstName lastName email department position phone address');

    if (!payroll) {
      return res.status(404).json({ error: 'Payroll record not found.' });
    }

    // Employees can only see their own
    if (req.user.role === 'employee' && payroll.employeeId._id.toString() !== req.user.employeeId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ payroll });
  } catch (err) {
    console.error('Get payroll by id error:', err);
    res.status(500).json({ error: 'Failed to fetch payroll record.' });
  }
};

// ─── DELETE /api/payroll/:id ────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ error: 'Payroll record not found.' });
    }
    if (payroll.status === 'paid') {
      return res.status(400).json({ error: 'Cannot delete a paid payroll record.' });
    }

    await Payroll.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payroll record deleted.' });
  } catch (err) {
    console.error('Delete payroll error:', err);
    res.status(500).json({ error: 'Failed to delete payroll record.' });
  }
};
