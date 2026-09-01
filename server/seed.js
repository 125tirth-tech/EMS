// Seed script - Creates test data for demo
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('./config');
const User = require('./models/User');
const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');
const Leave = require('./models/Leave');
const Payroll = require('./models/Payroll');
const Notification = require('./models/Notification');

async function seed() {
  await mongoose.connect(config.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear all collections
  await Promise.all([
    User.deleteMany({}), Employee.deleteMany({}),
    Attendance.deleteMany({}), Leave.deleteMany({}),
    Payroll.deleteMany({}), Notification.deleteMany({})
  ]);
  console.log('Cleared all collections');

  // Create admin user
  const adminPass = await bcrypt.hash('admin123', 10);
  const admin = await User.create({
    username: 'admin', email: 'admin@ems.com',
    password: adminPass, role: 'admin', accountStatus: 'active'
  });

  // Create HR user
  const hrPass = await bcrypt.hash('hr1234', 10);
  const hr = await User.create({
    username: 'hrmanager', email: 'hr@ems.com',
    password: hrPass, role: 'hr', accountStatus: 'active'
  });

  // Create employees
  const employees = [
    { firstName: 'Rahul', lastName: 'Sharma', email: 'rahul@ems.com', phone: '9876543210', department: 'Engineering', position: 'Senior Developer', salary: 85000 },
    { firstName: 'Priya', lastName: 'Patel', email: 'priya@ems.com', phone: '9876543211', department: 'Design', position: 'UI/UX Designer', salary: 65000 },
    { firstName: 'Amit', lastName: 'Kumar', email: 'amit@ems.com', phone: '9876543212', department: 'Marketing', position: 'Marketing Lead', salary: 72000 },
    { firstName: 'Sneha', lastName: 'Reddy', email: 'sneha@ems.com', phone: '9876543213', department: 'Engineering', position: 'Frontend Developer', salary: 68000 },
    { firstName: 'Vikram', lastName: 'Singh', email: 'vikram@ems.com', phone: '9876543214', department: 'Sales', position: 'Sales Manager', salary: 78000 },
    { firstName: 'Anita', lastName: 'Desai', email: 'anita@ems.com', phone: '9876543215', department: 'Human Resources', position: 'HR Executive', salary: 55000 },
    { firstName: 'Karthik', lastName: 'Nair', email: 'karthik@ems.com', phone: '9876543216', department: 'Finance', position: 'Accountant', salary: 60000 },
    { firstName: 'Deepa', lastName: 'Mehta', email: 'deepa@ems.com', phone: '9876543217', department: 'Engineering', position: 'Backend Developer', salary: 82000 },
    { firstName: 'Suresh', lastName: 'Gupta', email: 'suresh@ems.com', phone: '9876543218', department: 'Operations', position: 'Operations Head', salary: 90000 },
    { firstName: 'Meera', lastName: 'Joshi', email: 'meera@ems.com', phone: '9876543219', department: 'Support', position: 'Support Lead', salary: 52000 }
  ];

  const empPass = await bcrypt.hash('emp123', 10);
  const createdEmps = [];

  for (const empData of employees) {
    const emp = await Employee.create({ ...empData, status: 'active', dateOfJoining: new Date(2024, Math.floor(Math.random()*12), Math.floor(Math.random()*28)+1) });
    createdEmps.push(emp);
    const username = empData.email.split('@')[0];
    await User.create({
      username, email: empData.email, password: empPass,
      role: 'employee', employeeId: emp._id, accountStatus: 'active'
    });
  }

  // Create attendance records for past 5 days
  const today = new Date();
  for (let d = 0; d < 5; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    date.setHours(0,0,0,0);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (const emp of createdEmps) {
      const checkIn = new Date(date);
      checkIn.setHours(8 + Math.floor(Math.random()*2), Math.floor(Math.random()*60));
      const checkOut = new Date(date);
      checkOut.setHours(17 + Math.floor(Math.random()*2), Math.floor(Math.random()*60));
      const hours = Math.round(((checkOut - checkIn) / 3600000) * 100) / 100;

      try {
        await Attendance.create({
          employeeId: emp._id, date, checkIn, checkOut,
          status: checkIn.getHours() >= 9 ? 'late' : 'present',
          hoursWorked: hours
        });
      } catch(e) {}
    }
  }

  // Create some leave requests
  const leaveTypes = ['sick','casual','annual'];
  for (let i = 0; i < 5; i++) {
    const emp = createdEmps[i];
    const start = new Date(); start.setDate(start.getDate() + Math.floor(Math.random()*14) + 1);
    const end = new Date(start); end.setDate(end.getDate() + Math.floor(Math.random()*3));
    await Leave.create({
      employeeId: emp._id, type: leaveTypes[i % 3],
      startDate: start, endDate: end,
      reason: ['Feeling unwell','Family event','Vacation trip','Medical appointment','Personal work'][i],
      status: i < 2 ? 'pending' : 'approved',
      approvedBy: i >= 2 ? hr._id : null
    });
  }

  // Create payroll for current month
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  for (const emp of createdEmps) {
    const p = new Payroll({
      employeeId: emp._id, month, year, basicSalary: emp.salary,
      allowances: { hra: Math.round(emp.salary*0.2), transport: Math.round(emp.salary*0.05), medical: Math.round(emp.salary*0.03) },
      deductions: { tax: Math.round(emp.salary*0.1), insurance: Math.round(emp.salary*0.02), pf: Math.round(emp.salary*0.12) },
      status: 'draft', generatedBy: admin._id
    });
    await p.save();
  }

  // Create some notifications
  await Notification.create({ userId: admin._id, title: 'System Ready', message: 'EMS Pro has been initialized with test data.', type: 'system' });
  await Notification.create({ userId: hr._id, title: 'Pending Reviews', message: 'You have 2 pending leave requests to review.', type: 'leave' });

  console.log('\n✅ Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin: admin / admin123');
  console.log('  HR:    hrmanager / hr1234');
  console.log('  Emp:   rahul / emp123 (any employee)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
