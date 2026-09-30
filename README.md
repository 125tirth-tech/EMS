# ⚡ EMS Pro - Employee Management System

A comprehensive, full-stack Employee Management System built with Node.js, Express, MongoDB, and a modern vanilla JS SPA frontend.

## 🚀 Features

### 🤖 AI Assistant
- **Conversational HR Copilot**: Role-aware AI assistant powered by Google Gemini API (`GEMINI_API_KEY`) with seamless smart fallback.
- **Natural Language Actions**: Check leave balance, check-in / check-out, view latest payslips, and query company handbook policies.
- **Interactive Action Cards**: Inline leave approval/rejection cards for HR, leave breakdown chips, attendance status cards, and payslip breakdowns.
- **Voice Support**: 🎙️ Speech-to-Text (microphone input) and 🔊 Text-to-Speech (voice narration) via Web Speech API.
- **🔥 Employee Wellbeing & Burnout Risk Predictor**: Evaluates overtime hours, late arrival patterns, and leave deficits to compute fatigue/attrition risk scores and actionable retention recommendations.
- **✨ AI Content Studio**: One-click generation of Job Descriptions (JDs), Employee Performance Appraisal Reviews, and Company Announcements.
- **📖 Smart HR Knowledge Base**: Interactive searchable handbook for working hours, probation, leave rules, and code of conduct.

### Authentication & Authorization
- JWT-based authentication (login, signup, password reset)
- Role-based access control (Admin, HR, Employee)
- Auto-generated temporary credentials for new employees
- First-login password change flow

### Employee Management
- Full CRUD operations with search, filter, and pagination
- Department and status filtering
- Employee profile pages with document management
- Avatar initials with unique color generation

### Attendance Tracking
- Real-time check-in / check-out with live clock
- Late detection (after 9 AM)
- Hours worked calculation
- Monthly attendance summary with analytics
- Admin view of all employee attendance

### Leave Management
- Apply for leaves (sick, casual, annual, maternity, paternity, unpaid)
- Leave balance tracking per year
- Approve/reject workflow for HR/Admin
- Overlap detection for leave dates
- Real-time notifications on approval/rejection

### Payroll System
- Auto-generate payroll for individual or all employees
- Salary breakdown: Basic + Allowances (HRA, Transport, Medical) - Deductions (Tax, Insurance, PF)
- Status workflow: Draft → Processed → Paid
- Detailed payslip modal view
- Monthly payroll statistics

### Notifications
- Real-time notification bell with unread count
- Auto-notifications for leave actions, payroll payments
- Mark read / mark all read
- Click-to-navigate to relevant pages

### Document Management
- Upload documents (ID proof, resume, certificates, etc.)
- Base64 file storage (max 5MB)
- Download and delete functionality
- Per-employee document listing

### UI/UX
- Modern dark glassmorphism design with animated gradient backgrounds
- Responsive layout (mobile-friendly sidebar)
- Toast notifications for user actions
- Loading states and error handling
- Interactive charts (department distribution, status donut)

---

## 📋 Prerequisites

- **Node.js** v18+
- **MongoDB** running locally on port 27017

---

## 🛠️ Setup & Run

### 1. Install dependencies
```bash
npm install
```

### 2. Seed test data
```bash
npm run seed
```

### 3. Start the server
```bash
npm start
```

### 4. Open in browser
```
http://localhost:3000
```

---

## 🔑 Test Credentials

| Role     | Username    | Password   |
|----------|-------------|------------|
| Admin    | admin       | admin123   |
| HR       | hrmanager   | hr1234     |
| Employee | rahul       | emp123     |
| Employee | priya       | emp123     |
| Employee | amit        | emp123     |

*(Any employee username from the seed data uses password: `emp123`)*

---

## 📁 Project Structure

```
EMS/
├── .env                          # Environment variables
├── package.json                  # Dependencies & scripts
├── server/
│   ├── index.js                  # Express app entry point
│   ├── config.js                 # Configuration constants
│   ├── seed.js                   # Database seed script
│   ├── models/
│   │   ├── db.js                 # MongoDB connection
│   │   ├── User.js               # User model (auth)
│   │   ├── Employee.js           # Employee model
│   │   ├── Attendance.js         # Attendance model
│   │   ├── Leave.js              # Leave model
│   │   ├── Payroll.js            # Payroll model
│   │   ├── Notification.js       # Notification model
│   │   └── Document.js           # Document model
│   ├── controllers/
│   │   ├── authController.js     # Auth logic
│   │   ├── employeeController.js # Employee CRUD + stats
│   │   ├── attendanceController.js # Check-in/out, history
│   │   ├── leaveController.js    # Leave apply/approve/reject
│   │   ├── payrollController.js  # Payroll generation
│   │   ├── notificationController.js # Notification CRUD
│   │   └── documentController.js # Document upload/download
│   ├── middleware/
│   │   ├── auth.js               # JWT verification
│   │   └── roleCheck.js          # Role authorization
│   └── routes/
│       ├── auth.js               # Auth routes
│       ├── employees.js          # Employee routes
│       ├── attendance.js         # Attendance routes
│       ├── leaves.js             # Leave routes
│       ├── payroll.js            # Payroll routes
│       ├── notifications.js      # Notification routes
│       └── documents.js          # Document routes
└── public/
    ├── index.html                # SPA entry point
    ├── css/styles.css            # Complete design system
    └── js/
        ├── api.js                # API client with JWT
        ├── app.js                # Router & layout controller
        ├── auth.js               # Login/signup pages
        ├── dashboard.js          # Dashboard with analytics
        ├── employees.js          # Employee list page
        ├── employeeDetail.js     # Employee profile page
        ├── employeeForm.js       # Add/edit employee form
        ├── attendance.js         # Attendance tracking
        ├── leaves.js             # Leave management
        ├── payroll.js            # Payroll management
        ├── notifications.js      # Notification panel
        ├── documents.js          # Document management
        └── profile.js            # Employee self-profile
```

---

## 🔌 API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/signup` - HR registration
- `POST /api/auth/register` - Create user (admin/HR)
- `POST /api/auth/set-password` - First-time password setup
- `POST /api/auth/forgot-password` - Generate reset token
- `POST /api/auth/reset-password` - Reset with token
- `GET /api/auth/me` - Current user info

### Employees
- `GET /api/employees` - List with search/filter/pagination
- `GET /api/employees/stats` - Dashboard statistics
- `GET /api/employees/:id` - Get by ID
- `POST /api/employees` - Create (admin/HR)
- `PUT /api/employees/:id` - Update (admin/HR)
- `DELETE /api/employees/:id` - Delete (admin)

### Attendance
- `POST /api/attendance/check-in` - Check in
- `POST /api/attendance/check-out` - Check out
- `GET /api/attendance/today` - Today's status
- `GET /api/attendance/my-history` - Personal history
- `GET /api/attendance/summary` - Monthly summary
- `GET /api/attendance/all` - All records (admin/HR)
- `POST /api/attendance/mark` - Mark attendance (admin/HR)

### Leaves
- `POST /api/leaves/apply` - Apply for leave
- `GET /api/leaves/my-leaves` - Personal leaves + balance
- `GET /api/leaves/all` - All requests (admin/HR)
- `PUT /api/leaves/:id/approve` - Approve (admin/HR)
- `PUT /api/leaves/:id/reject` - Reject (admin/HR)
- `DELETE /api/leaves/:id` - Cancel leave

### Payroll
- `GET /api/payroll` - List payroll records
- `GET /api/payroll/:id` - Payslip detail
- `POST /api/payroll/generate` - Generate individual
- `POST /api/payroll/generate-all` - Generate for all
- `PUT /api/payroll/:id` - Update status
- `DELETE /api/payroll/:id` - Delete (admin)

### Notifications
- `GET /api/notifications` - List notifications
- `GET /api/notifications/unread-count` - Badge count
- `PUT /api/notifications/read-all` - Mark all read
- `PUT /api/notifications/:id/read` - Mark one read
- `DELETE /api/notifications/:id` - Delete
- `POST /api/notifications` - Send (admin/HR)

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents/upload` - Upload (base64)
- `GET /api/documents/:id/download` - Download
- `DELETE /api/documents/:id` - Delete (admin/HR)

### AI Assistant
- `POST /api/ai/chat` - Conversational copilot with action execution
- `GET /api/ai/history` - Retrieve user conversation history
- `DELETE /api/ai/history` - Clear conversation history
- `GET /api/ai/policies` - Retrieve company policy handbook
- `GET /api/ai/burnout-risk` - Calculate employee burnout & retention risk metrics (admin/HR)
- `POST /api/ai/generate` - Draft JDs, performance reviews, or announcements with Gemini AI (admin/HR)

---

## 🎨 Tech Stack

- **Backend**: Node.js, Express 5, Mongoose 9
- **Database**: MongoDB
- **Auth**: JWT + bcrypt
- **Frontend**: Vanilla HTML/CSS/JS SPA
- **Design**: Dark glassmorphism with Inter font

---

        
Built with ❤️ by dhoop
