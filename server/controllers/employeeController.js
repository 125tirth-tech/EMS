const Employee = require('../models/Employee');
const config = require('../config');

// GET /api/employees
exports.getAll = async (req, res) => {
  try {
    const { search, department, status, sort } = req.query;
    const filter = {};

    // Search using regex for partial matching
    if (search) {
      const q = search.trim();
      filter.$or = [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { position: { $regex: q, $options: 'i' } }
      ];
    }

    // Filter by department
    if (department) {
      filter.department = department;
    }

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Role-based filtering: employees can only see themselves
    if (req.user.role === 'employee') {
      filter._id = req.user.employeeId;
    }

    // Build sort object
    let sortObj = {};
    if (sort) {
      const [field, order] = sort.split(':');
      sortObj[field] = order === 'desc' ? -1 : 1;
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await Employee.countDocuments(filter);
    const employees = await Employee.find(filter).sort(sortObj).skip(skip).limit(limit);

    res.json({ employees, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('GetAll error:', err);
    res.status(500).json({ error: 'Failed to fetch employees.' });
  }
};

// GET /api/employees/stats
exports.getStats = async (req, res) => {
  try {
    const employees = await Employee.find();

    const stats = {
      total: employees.length,
      active: employees.filter(e => e.status === 'active').length,
      inactive: employees.filter(e => e.status === 'inactive').length,
      onLeave: employees.filter(e => e.status === 'on-leave').length,
      departments: {}
    };

    config.DEPARTMENTS.forEach(dept => {
      stats.departments[dept] = employees.filter(e => e.department === dept).length;
    });

    // Recent hires (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    stats.recentHires = employees.filter(
      e => new Date(e.dateOfJoining) >= thirtyDaysAgo
    ).length;

    res.json({ stats });
  } catch (err) {
    console.error('GetStats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
};

// GET /api/employees/:id
exports.getById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // Employees can only view themselves
    if (req.user.role === 'employee' && employee._id.toString() !== req.user.employeeId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ employee });
  } catch (err) {
    // Handle invalid ObjectId format
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    console.error('GetById error:', err);
    res.status(500).json({ error: 'Failed to fetch employee.' });
  }
};

// POST /api/employees
exports.create = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, department, position, salary, dateOfJoining, status, address } = req.body;

    if (!firstName || !lastName || !email || !department || !position) {
      return res.status(400).json({ error: 'First name, last name, email, department, and position are required.' });
    }

    // Check duplicate email
    const existing = await Employee.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An employee with this email already exists.' });
    }

    const newEmployee = await Employee.create({
      firstName,
      lastName,
      email,
      phone: phone || '',
      department,
      position,
      salary: salary || 0,
      dateOfJoining: dateOfJoining || new Date(),
      status: status || 'active',
      avatar: null,
      address: address || ''
    });

    // ─── Auto-create user account for the employee ────────
    const bcrypt = require('bcryptjs');
    const User = require('../models/User');

    // Generate username from email (before @)
    let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = baseUsername;
    let counter = 1;
    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    // Generate temporary password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let tempPassword = '';
    for (let i = 0; i < 8; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const userAccount = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'employee',
      employeeId: newEmployee._id,
      accountStatus: 'password-not-set',
      mustChangePassword: true,
      tempPassword: tempPassword
    });

    res.status(201).json({
      employee: newEmployee,
      credentials: {
        username: userAccount.username,
        tempPassword: tempPassword,
        message: `Login account created. Temp password: ${tempPassword}. Employee must change it on first login.`
      }
    });
  } catch (err) {
    console.error('Create error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An employee with this email already exists.' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Failed to create employee.' });
  }
};

// PUT /api/employees/:id
exports.update = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // Check email uniqueness if updating email
    if (req.body.email && req.body.email.toLowerCase() !== employee.email) {
      const existing = await Employee.findOne({ email: req.body.email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ error: 'An employee with this email already exists.' });
      }
    }

    const updated = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json({ employee: updated });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An employee with this email already exists.' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update employee.' });
  }
};

// DELETE /api/employees/:id
exports.remove = async (req, res) => {
  try {
    const deleted = await Employee.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // Also remove the linked user account
    const User = require('../models/User');
    await User.deleteOne({ employeeId: req.params.id });

    res.json({ message: 'Employee and linked user account deleted successfully.' });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete employee.' });
  }
};

// GET /api/departments
exports.getDepartments = (req, res) => {
  res.json({ departments: config.DEPARTMENTS });
};
