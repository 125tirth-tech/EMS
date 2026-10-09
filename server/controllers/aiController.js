const AIChat = require('../models/AIChat');
const Employee = require('../models/Employee');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Notification = require('../models/Notification');
const config = require('../config');

// ─── Company Policies Knowledge Base ─────────────────────────
const POLICIES = [
  {
    category: 'Attendance & Working Hours',
    title: 'Standard Working Hours & Grace Period',
    content: 'Official working hours are 9:00 AM to 6:00 PM Monday through Friday. A grace period of 15 minutes is allowed (until 9:15 AM). Check-ins after 9:15 AM are marked as Late. Minimum 4 hours of work is required for a half-day mark; less than 4 hours is considered absent.'
  },
  {
    category: 'Leave Policy',
    title: 'Annual Leave Entitlements',
    content: 'All full-time employees are entitled to: 12 Sick Leaves, 12 Casual Leaves, and 15 Annual/Privilege Leaves per calendar year. Maternity leave is 180 days for eligible female employees, and Paternity leave is 15 days. Unpaid leaves may be requested subject to managerial approval.'
  },
  {
    category: 'Leave Policy',
    title: 'Leave Application & Approval Workflow',
    content: 'Leave requests should be submitted at least 48 hours in advance for planned casual/annual leaves. Sick leaves can be submitted on the day of illness. All leaves require approval from HR or your reporting manager. Overlapping leave dates are automatically rejected.'
  },
  {
    category: 'Payroll & Compensation',
    title: 'Salary Structure & Disbursal',
    content: 'Salaries are disbursed on the final working day of each calendar month. The gross salary consists of Basic (approx 50%), HRA (20%), Transport Allowance (5%), and Medical Allowance (3%). Mandatory deductions include Provident Fund (PF at 12%), Professional Tax, and Income Tax (TDS).'
  },
  {
    category: 'Code of Conduct',
    title: 'Workplace Ethics & Confidentiality',
    content: 'EMS Pro maintains zero tolerance for harassment, discrimination, or breach of proprietary employee and company data. All employee documents, payslips, and personal records are strictly confidential and protected under role-based access control.'
  },
  {
    category: 'Probation & Notice Period',
    title: 'Probation Period & Separation',
    content: 'New employees undergo a 3-month probation period. Notice period upon confirmation is 60 days for permanent staff and 30 days during probation, unless mutually agreed otherwise by HR.'
  }
];

// ─── Gemini API Caller ────────────────────────────────────────
async function callGemini(messages, systemInstruction) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    return null;
  }

  // Google AI Studio Gemini API keys start with 'AIzaSy'
  if (!apiKey.startsWith('AIzaSy')) {
    if (!global._geminiKeyWarned) {
      console.warn('⚠️ [AI Assistant] GEMINI_API_KEY is not a valid Google AI Studio key (must start with "AIzaSy..."). Using built-in intelligent HR assistant.');
      global._geminiKeyWarned = true;
    }
    return null;
  }

  // Model list: try gemini-1.5-flash or gemini-2.0-flash / gemini-2.5-flash
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'];
  
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const contents = messages.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.message || m.text || '' }]
      }));

      const body = {
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      };

      if (systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`Gemini call to ${model} returned status ${res.status}:`, errorText);
        if (res.status === 400 && errorText.includes('API_KEY_INVALID')) {
          break; // Stop retrying other models with an invalid key
        }
        continue; // try next model if failed
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const reply = candidate?.content?.parts?.[0]?.text;
      if (reply) {
        return reply;
      }
    } catch (err) {
      console.error(`Gemini call error with ${model}:`, err.message);
    }
  }

  return null;
}

// ─── Helper: Get User Context ─────────────────────────────────
async function getUserContext(user) {
  const context = {
    username: user.username,
    role: user.role,
    employeeId: user.employeeId,
    employeeProfile: null,
    todayAttendance: null,
    leaveBalance: null,
    recentPayslip: null
  };

  if (user.employeeId) {
    const employee = await Employee.findById(user.employeeId);
    if (employee) {
      context.employeeProfile = {
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        position: employee.position,
        salary: employee.salary,
        status: employee.status,
        dateOfJoining: employee.dateOfJoining
      };
    }

    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const att = await Attendance.findOne({ employeeId: user.employeeId, date: today });
    if (att) {
      context.todayAttendance = {
        checkIn: att.checkIn ? att.checkIn.toLocaleTimeString() : null,
        checkOut: att.checkOut ? att.checkOut.toLocaleTimeString() : null,
        status: att.status,
        hoursWorked: att.hoursWorked
      };
    }

    // Leave balance
    const year = new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const approvedLeaves = await Leave.find({
      employeeId: user.employeeId,
      status: 'approved',
      startDate: { $gte: yearStart, $lte: yearEnd }
    });

    const balance = {
      sick: { total: 12, used: 0 },
      casual: { total: 12, used: 0 },
      annual: { total: 15, used: 0 }
    };
    approvedLeaves.forEach(l => {
      if (balance[l.type]) {
        balance[l.type].used += l.days;
      }
    });
    Object.keys(balance).forEach(k => {
      balance[k].remaining = Math.max(0, balance[k].total - balance[k].used);
    });
    context.leaveBalance = balance;

    // Recent payslip
    const latestPay = await Payroll.findOne({ employeeId: user.employeeId }).sort({ year: -1, month: -1 });
    if (latestPay) {
      context.recentPayslip = {
        month: latestPay.month,
        year: latestPay.year,
        netPay: latestPay.netPay,
        grossSalary: latestPay.grossSalary,
        status: latestPay.status
      };
    }
  }

  return context;
}

// ─── POST /api/ai/chat ────────────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const userContext = await getUserContext(req.user);

    // Save user message to AIChat history
    await AIChat.create({
      userId,
      role: 'user',
      message: message.trim()
    });

    // Detect specialized user actions / queries
    const lower = message.toLowerCase().trim();
    let action = null;
    let fallbackReply = '';

    // Action 1: Leave Balance Inquiry
    if (lower.includes('leave balance') || lower.includes('leaves left') || lower.includes('how many leaves')) {
      if (userContext.leaveBalance) {
        const bal = userContext.leaveBalance;
        action = {
          type: 'leave_balance_card',
          data: bal
        };
        fallbackReply = `Here is your current leave balance for ${new Date().getFullYear()}:\n- 🩺 **Sick Leave**: ${bal.sick.remaining} remaining (${bal.sick.used} used of ${bal.sick.total})\n- 🏖️ **Casual Leave**: ${bal.casual.remaining} remaining (${bal.casual.used} used of ${bal.casual.total})\n- ✈️ **Annual Leave**: ${bal.annual.remaining} remaining (${bal.annual.used} used of ${bal.annual.total})\n\nWould you like me to help you apply for leave?`;
      } else {
        fallbackReply = 'Your employee profile is not linked to calculate leave balances. Please contact HR.';
      }
    }

    // Action 2: Check Attendance Status / Clock in / Clock out
    else if (lower.includes('attendance') || lower.includes('check in') || lower.includes('clock in') || lower.includes('clock out')) {
      if (lower.includes('clock in') || lower.includes('check in')) {
        if (!req.user.employeeId) {
          fallbackReply = 'You do not have an employee profile linked to clock in.';
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          let att = await Attendance.findOne({ employeeId: req.user.employeeId, date: today });
          if (att && att.checkIn) {
            fallbackReply = `You have already checked in today at **${att.checkIn.toLocaleTimeString()}** (Status: ${att.status}).`;
          } else {
            const now = new Date();
            const nineAM = new Date(today);
            nineAM.setHours(9, 0, 0, 0);
            const status = now > nineAM ? 'late' : 'present';
            att = await Attendance.create({
              employeeId: req.user.employeeId,
              date: today,
              checkIn: now,
              status
            });
            fallbackReply = `✅ Successfully checked in at **${now.toLocaleTimeString()}**! Status recorded as: **${status}**. Have a productive day!`;
            action = { type: 'attendance_status', data: att };
          }
        }
      } else if (lower.includes('clock out') || lower.includes('check out')) {
        if (!req.user.employeeId) {
          fallbackReply = 'You do not have an employee profile linked to clock out.';
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const att = await Attendance.findOne({ employeeId: req.user.employeeId, date: today });
          if (!att || !att.checkIn) {
            fallbackReply = '⚠️ You have not checked in today yet.';
          } else if (att.checkOut) {
            fallbackReply = `You have already checked out today at **${att.checkOut.toLocaleTimeString()}** (${att.hoursWorked} hours).`;
          } else {
            const now = new Date();
            att.checkOut = now;
            const diffMs = now - att.checkIn;
            att.hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
            if (att.hoursWorked < 4) att.status = 'half-day';
            await att.save();
            fallbackReply = `🚪 Successfully checked out at **${now.toLocaleTimeString()}**! Total hours worked today: **${att.hoursWorked} hrs**.`;
            action = { type: 'attendance_status', data: att };
          }
        }
      } else {
        const att = userContext.todayAttendance;
        if (att) {
          fallbackReply = `📅 **Today's Attendance Status**:\n- **Status**: ${att.status.toUpperCase()}\n- **Check-in**: ${att.checkIn || 'Not recorded'}\n- **Check-out**: ${att.checkOut || 'Active / Not checked out'}\n- **Hours Worked**: ${att.hoursWorked || 0} hrs`;
          action = { type: 'attendance_status', data: att };
        } else {
          fallbackReply = 'You have not checked in yet today. You can say **"Clock in"** or click Check-In from the Attendance page.';
        }
      }
    }

    // Action 3: HR Pending Leaves & Approval
    else if ((userRole === 'admin' || userRole === 'hr') && (lower.includes('pending leave') || lower.includes('leave requests') || lower.includes('who is on leave'))) {
      const pendingLeaves = await Leave.find({ status: 'pending' })
        .populate('employeeId', 'firstName lastName department position')
        .sort({ createdAt: -1 })
        .limit(5);

      if (pendingLeaves.length > 0) {
        action = {
          type: 'pending_leaves_card',
          data: pendingLeaves
        };
        fallbackReply = `Found **${pendingLeaves.length} pending leave request(s)** awaiting approval. You can review and approve or reject them directly from the card below:`;
      } else {
        fallbackReply = '🎉 There are currently no pending leave requests awaiting approval!';
      }
    }

    // Action 4: Workforce / Department Statistics (HR/Admin)
    else if ((userRole === 'admin' || userRole === 'hr') && (lower.includes('workforce') || lower.includes('headcount') || lower.includes('how many employee') || lower.includes('department stats'))) {
      const totalEmployees = await Employee.countDocuments();
      const activeEmployees = await Employee.countDocuments({ status: 'active' });
      const deptCounts = await Employee.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      const depts = deptCounts.map(d => `- **${d._id}**: ${d.count}`).join('\n');
      
      fallbackReply = `📊 **Workforce Summary**:\n- **Total Headcount**: ${totalEmployees} (${activeEmployees} active)\n\n**Department Breakdown**:\n${depts}`;
      action = { type: 'stats_card', data: { totalEmployees, activeEmployees, deptCounts } };
    }

    // Action 5: My Payslip / Payroll
    else if (lower.includes('payslip') || lower.includes('salary') || lower.includes('payroll')) {
      if (userRole === 'employee') {
        const latest = await Payroll.findOne({ employeeId: req.user.employeeId }).sort({ year: -1, month: -1 });
        if (latest) {
          const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          fallbackReply = `💰 **Latest Payslip Summary (${monthNames[latest.month]} ${latest.year})**:\n- **Basic Salary**: ₹${latest.basicSalary.toLocaleString('en-IN')}\n- **Gross Pay**: ₹${latest.grossSalary.toLocaleString('en-IN')}\n- **Total Deductions**: ₹${latest.totalDeductions.toLocaleString('en-IN')}\n- **Net Take-home**: **₹${latest.netPay.toLocaleString('en-IN')}**\n- **Status**: ${latest.status.toUpperCase()}`;
          action = { type: 'payroll_card', data: latest };
        } else {
          fallbackReply = 'No payslips found for your account yet. Payroll records will appear once processed by HR.';
        }
      } else {
        const totalPayrolls = await Payroll.countDocuments();
        const pendingPayout = await Payroll.find({ status: { $ne: 'paid' } });
        fallbackReply = `💼 **Payroll Management Overview**:\n- Total records processed: **${totalPayrolls}**\n- Pending payouts: **${pendingPayout.length}**\n\nYou can generate monthly payroll for all employees in one click from the Payroll module.`;
      }
    }

    // Action 6: Company Policies & Knowledge Base
    else if (lower.includes('policy') || lower.includes('rule') || lower.includes('working hour') || lower.includes('timing') || lower.includes('probation') || lower.includes('notice period')) {
      const matched = POLICIES.filter(p => 
        lower.includes(p.category.toLowerCase()) || 
        lower.includes(p.title.toLowerCase()) || 
        ((lower.includes('working') || lower.includes('hour') || lower.includes('timing')) && p.category.includes('Attendance')) ||
        (lower.includes('leave') && p.category.includes('Leave')) ||
        (lower.includes('salary') && p.category.includes('Payroll')) ||
        (lower.includes('probation') && p.title.includes('Probation')) ||
        (lower.includes('notice') && p.title.includes('Notice'))
      );
      
      const found = matched.length > 0 ? matched : POLICIES.slice(0, 2);
      fallbackReply = `📖 **Company Policy Information**:\n\n` + 
        found.map(p => `### ${p.title} (${p.category})\n${p.content}`).join('\n\n') +
        `\n\n*You can also explore all official guidelines in the **Smart HR Knowledge Base** tab above.*`;
      action = { type: 'policies', data: found };
    }

    // Action 7: Apply Leave Guide
    else if (lower.includes('apply') && lower.includes('leave')) {
      fallbackReply = `📝 **How to Apply for Leave**:\n\nYou can easily apply for leave using the **Leave Management** module:\n1. Choose your Leave Type (*Sick, Casual, Annual, Unpaid*).\n2. Select your Start Date and End Date.\n3. Enter the reason for your request.\n\nYour manager and HR will receive an instant notification once submitted. Would you like to navigate to the Leave Management page now?`;
      action = { type: 'apply_leave_guide' };
    }

    // Prepare Gemini Prompt & Call
    let finalBotMessage = fallbackReply;

    // Fetch previous 6 messages for conversation context
    const recentHistory = await AIChat.find({ userId })
      .sort({ createdAt: -1 })
      .limit(6);
    recentHistory.reverse();

    const formattedHistory = recentHistory.map(h => ({
      role: h.role,
      message: h.message
    }));

    const systemInstruction = `
You are the intelligent HR Copilot and Employee Assistant for "EMS Pro" (Employee Management System).
User details:
- Name: ${userContext.employeeProfile?.name || userContext.username}
- Role: ${userContext.role} (admin, hr, or employee)
- Department: ${userContext.employeeProfile?.department || 'N/A'}
- Position: ${userContext.employeeProfile?.position || 'N/A'}
- Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Company Policies Overview:
${POLICIES.map(p => `[${p.category}] ${p.title}: ${p.content}`).join('\n')}

Guidelines:
- Provide friendly, concise, empathetic, professional, and accurate responses.
- Format responses nicely with markdown (bold, bullet points, headers).
- If the user asks about leave balance, attendance, payslip, policies, or HR workflows, provide immediate and clear guidance based on their role and data.
- If the user is an employee, they cannot view other employees' salaries or confidential data.
- If the user wants to apply for leave, prompt them for the Leave Type (sick, casual, annual), Start Date, End Date, and Reason.
${action ? `Note: A structured action card of type "${action.type}" will be shown below your text.` : ''}
`;

    // Attempt Gemini call
    const geminiReply = await callGemini(formattedHistory, systemInstruction);
    if (geminiReply) {
      finalBotMessage = geminiReply;
    } else if (!finalBotMessage) {
      // Smart default when no API key and no specific intent matched
      finalBotMessage = `Hello! I am your **EMS Pro AI Assistant**.\n\nI can help you with:\n- 🏖️ **Leaves**: Check your leave balance or learn how to apply for leave\n- ⏰ **Attendance**: Check today's clock-in status, clock in, or clock out\n- 💰 **Payroll**: Inquire about your salary breakdown and latest payslip\n- 📖 **HR Policies**: Ask about working hours, probation, leave rules, or code of conduct\n${userRole !== 'employee' ? '- 👥 **HR Tools**: Review pending leaves, check absentees, and workforce analytics' : ''}\n`;
    }

    // Save bot reply to AIChat history
    const botChat = await AIChat.create({
      userId,
      role: 'model',
      message: finalBotMessage,
      action: action || null
    });

    res.json({
      message: finalBotMessage,
      action: action || null,
      id: botChat._id,
      createdAt: botChat.createdAt
    });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'Failed to process AI chat message.' });
  }
};

// ─── GET /api/ai/history ──────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const history = await AIChat.find({ userId: req.user.id })
      .sort({ createdAt: 1 })
      .limit(50);
    res.json({ history });
  } catch (err) {
    console.error('Get AI history error:', err);
    res.status(500).json({ error: 'Failed to load conversation history.' });
  }
};

// ─── DELETE /api/ai/history ───────────────────────────────────
exports.clearHistory = async (req, res) => {
  try {
    await AIChat.deleteMany({ userId: req.user.id });
    res.json({ message: 'Conversation history cleared.' });
  } catch (err) {
    console.error('Clear AI history error:', err);
    res.status(500).json({ error: 'Failed to clear conversation history.' });
  }
};

// ─── GET /api/ai/policies ─────────────────────────────────────
exports.getPolicies = async (req, res) => {
  res.json({ policies: POLICIES });
};

// ─── GET /api/ai/burnout-risk (HR Innovation) ─────────────────
exports.getBurnoutRisk = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const employees = await Employee.find({ status: 'active' }).sort({ department: 1 });
    const results = [];

    for (const emp of employees) {
      // 1. Fetch attendance records in last 30 days
      const attendances = await Attendance.find({
        employeeId: emp._id,
        date: { $gte: thirtyDaysAgo }
      });

      // 2. Fetch leaves in last 30 days
      const leaves = await Leave.find({
        employeeId: emp._id,
        status: 'approved',
        startDate: { $gte: thirtyDaysAgo }
      });

      let totalHours = 0;
      let lateCount = 0;
      let longDaysCount = 0;

      attendances.forEach(a => {
        if (a.hoursWorked) totalHours += a.hoursWorked;
        if (a.status === 'late') lateCount++;
        if (a.hoursWorked && a.hoursWorked > 9.5) longDaysCount++;
      });

      const workDays = attendances.length || 1;
      const avgDailyHours = Math.round((totalHours / workDays) * 10) / 10;
      const leaveDaysTaken = leaves.reduce((sum, l) => sum + (l.days || 1), 0);

      // Risk score calculation (0 - 100)
      let riskScore = 20; // baseline healthy
      const riskFactors = [];

      if (avgDailyHours > 9.5) {
        riskScore += 30;
        riskFactors.push(`High average daily workload (${avgDailyHours} hrs/day)`);
      } else if (avgDailyHours > 8.5) {
        riskScore += 15;
        riskFactors.push(`Elevated daily workload (${avgDailyHours} hrs/day)`);
      }

      if (longDaysCount >= 5) {
        riskScore += 25;
        riskFactors.push(`${longDaysCount} days with significant overtime (>9.5h)`);
      }

      if (lateCount >= 4) {
        riskScore += 15;
        riskFactors.push(`Frequent late check-ins (${lateCount} times this month)`);
      }

      if (leaveDaysTaken === 0 && avgDailyHours >= 8.5) {
        riskScore += 15;
        riskFactors.push('Zero leave utilization during intensive working period');
      }

      // Cap at 95
      riskScore = Math.min(95, Math.max(10, riskScore));

      let riskLevel = 'Low';
      let recommendation = 'Employee maintains a healthy work-life balance.';

      if (riskScore >= 70) {
        riskLevel = 'High';
        recommendation = 'Immediate check-in recommended. High fatigue and burnout indicators detected. Encourage taking accumulated leave.';
      } else if (riskScore >= 45) {
        riskLevel = 'Moderate';
        recommendation = 'Monitor workload and overtime closely. Consider redistributing pending tasks.';
      }

      results.push({
        id: emp._id,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        position: emp.position,
        avgDailyHours,
        totalHours: Math.round(totalHours),
        lateCount,
        longDaysCount,
        leaveDaysTaken,
        riskScore,
        riskLevel,
        riskFactors,
        recommendation
      });
    }

    // Sort by riskScore descending so highest risk is at top
    results.sort((a, b) => b.riskScore - a.riskScore);

    const highRiskCount = results.filter(r => r.riskLevel === 'High').length;
    const moderateRiskCount = results.filter(r => r.riskLevel === 'Moderate').length;
    const healthyCount = results.filter(r => r.riskLevel === 'Low').length;

    res.json({
      summary: {
        totalEvaluated: results.length,
        highRisk: highRiskCount,
        moderateRisk: moderateRiskCount,
        healthy: healthyCount
      },
      employees: results
    });
  } catch (err) {
    console.error('Burnout risk error:', err);
    res.status(500).json({ error: 'Failed to calculate burnout analytics.' });
  }
};

// ─── POST /api/ai/generate (HR Innovation Suite) ──────────────
exports.generateContent = async (req, res) => {
  try {
    const { type, payload } = req.body;
    if (!type || !payload) {
      return res.status(400).json({ error: 'Type and payload are required.' });
    }

    let prompt = '';
    let defaultResult = '';

    if (type === 'job_description') {
      const { title, department, experience, keySkills, employmentType } = payload;
      prompt = `Draft a professional, compelling, and inclusive Job Description for the following role:
Role: ${title}
Department: ${department}
Experience Required: ${experience || '2-4 years'}
Key Skills: ${keySkills || 'Standard industry skills'}
Employment Type: ${employmentType || 'Full-time'}

Include:
1. Role Summary
2. Key Responsibilities (5-7 bullet points)
3. Required Qualifications & Skills
4. Nice-to-Have Skills
5. What We Offer (EMS Pro Perks & Culture)
Format with clean markdown headers and bullet points.`;

      defaultResult = `### 📋 Job Description: ${title} (${department})

**Employment Type**: ${employmentType || 'Full-time'} | **Experience**: ${experience || '3+ years'}

#### 🎯 Role Overview
We are looking for a talented and driven **${title}** to join our **${department}** team. In this role, you will be instrumental in executing our core strategic initiatives and delivering exceptional outcomes.

#### 🛠️ Key Responsibilities
- Lead and execute high-impact initiatives in ${department}.
- Collaborate cross-functionally with team members to streamline workflows.
- Continuously evaluate industry trends and implement best practices.
- Deliver measurable business results with high quality and on-time delivery.
- Mentor junior team members and foster a collaborative environment.

#### 🎓 Required Qualifications
- Proven background with ${experience || '3+ years'} of experience in ${title} or related field.
- Proficient in: ${keySkills || 'Relevant core skills, analytical thinking, teamwork'}.
- Strong communication, problem-solving, and organizational skills.

#### 🌟 What We Offer at EMS Pro
- Competitive salary with regular performance bonuses.
- Comprehensive health and medical insurance.
- Generous paid leave (sick, casual, annual).
- Accelerated career progression and learning stipends.`;
    } 
    
    else if (type === 'performance_review') {
      const { employeeName, position, department, achievements, improvementAreas, rating } = payload;
      prompt = `Draft a constructive, supportive, and professional HR Performance & Appraisal Review:
Employee Name: ${employeeName}
Position: ${position} (${department})
Overall Performance Rating: ${rating || 'Exceeds Expectations'} / 5
Key Achievements: ${achievements || 'Consistently met quarterly KPIs and demonstrated great leadership'}
Areas for Growth / Improvement: ${improvementAreas || 'Continue enhancing cross-team technical documentation'}

Include:
1. Executive Performance Summary
2. Accomplishment Highlights
3. Constructive Feedback & Growth Opportunities
4. Goals for Next Cycle
5. Final Manager Recommendation
Format with clean markdown.`;

      defaultResult = `### 🌟 Performance Appraisal Review: ${employeeName}

**Position**: ${position} | **Department**: ${department} | **Rating**: ${rating || '4.5'} / 5.0

#### 1. Executive Summary
During this evaluation cycle, **${employeeName}** has demonstrated exceptional dedication and consistent alignment with company goals. Their contribution as a ${position} has been a major asset to the ${department} department.

#### 2. Key Achievements & Strengths
- **Goal Attainment**: ${achievements || 'Successfully delivered all assigned deliverables ahead of deadlines with high quality.'}
- **Collaboration**: Regularly supported peers and fostered strong teamwork across departments.
- **Problem Solving**: Exhibited proactive initiative when addressing operational hurdles.

#### 3. Development Opportunities
- **Growth Focus**: ${improvementAreas || 'Further expand mentoring of junior colleagues and participate in strategic roadmap planning.'}

#### 4. Objectives for Next Review Period
1. Maintain consistent delivery quality across core responsibilities.
2. Complete advanced training/certification relevant to ${position}.
3. Drive at least one cross-departmental innovation initiative.

#### 5. Manager Recommendation
Strongly recommended for performance incentive / annual bonus increment.`;
    } 
    
    else if (type === 'announcement') {
      const { title, audience, eventDate, details, tone } = payload;
      prompt = `Draft an official company-wide HR announcement:
Title / Occasion: ${title}
Target Audience: ${audience || 'All Employees'}
Effective Date: ${eventDate || 'Immediate'}
Key Details: ${details || 'Important company notice'}
Tone: ${tone || 'Warm, professional, and inspiring'}

Format with an engaging header, clear highlights, and HR sign-off.`;

      defaultResult = `### 📢 Announcement: ${title}

**To**: ${audience || 'All Employees'}  
**Date**: ${eventDate || new Date().toLocaleDateString()}  

Dear Team,

${details || 'We are excited to share an important company update with everyone.'}

#### 📌 Key Highlights:
- **Action Required**: Please review the guidelines and mark your calendars accordingly.
- **Support**: For any questions, please reach out to the HR department.

Thank you for your continuous dedication and passion in making EMS Pro an exceptional workplace!

Warm regards,  
**People & Culture Team**  
*EMS Pro Management*`;
    } else {
      return res.status(400).json({ error: 'Invalid generation type.' });
    }

    // Attempt Gemini call
    const messages = [{ role: 'user', message: prompt }];
    const geminiResult = await callGemini(messages, 'You are an expert HR content writer and organizational psychology specialist.');

    res.json({
      content: geminiResult || defaultResult,
      isAiGenerated: !!geminiResult
    });
  } catch (err) {
    console.error('AI generate error:', err);
    res.status(500).json({ error: 'Failed to generate content.' });
  }
};
