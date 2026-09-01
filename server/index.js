require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const connectDB = require('./models/db');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leaves');
const payrollRoutes = require('./routes/payroll');
const notificationRoutes = require('./routes/notifications');
const documentRoutes = require('./routes/documents');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);

// SPA fallback — serve index.html for all non-API routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  } else {
    next();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// Connect to MongoDB, then start server
async function startServer() {
  console.log('\n  🔌 Connecting to MongoDB...');
  const dbConnection = await connectDB();

  app.listen(config.PORT, () => {
    console.log(`  🚀 EMS Server running at http://localhost:${config.PORT}`);
    console.log(`  📊 API available at http://localhost:${config.PORT}/api`);
    if (dbConnection) {
      console.log(`  🗄️  Database connection ready`);
    } else {
      console.log('  ⚠️  Database connection is unavailable; install/start MongoDB to enable data APIs');
    }
    console.log(`  📁 Modules: Auth, Employees, Attendance, Leaves, Payroll, Notifications, Documents\n`);
  });
}

startServer();

module.exports = app;
