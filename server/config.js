const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/employee_management_system',
  JWT_SECRET: process.env.JWT_SECRET || 'ems-secret-key-2026',
  JWT_EXPIRES_IN: '24h',
  DEPARTMENTS: [
    'Engineering',
    'Marketing',
    'Sales',
    'Human Resources',
    'Finance',
    'Operations',
    'Design',
    'Support'
  ]
};
