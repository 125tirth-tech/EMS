// ═══════════════════════════════════════════════════════════════
// AIAssistant.js - AI HR Chatbot &  Innovation Suite
// ═══════════════════════════════════════════════════════════════

const AiAssistantPage = {
  currentTab: 'chat', // 'chat' | 'burnout' | 'generator' | 'policies'
  isSpeaking: false,
  ttsEnabled: false,
  recognition: null,
  isListening: false,
  generatorType: 'job_description',

  async render() {
    const user = App.user;
    const isAdmin = App.isAdminOrHR();

    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="ai-container">
        <!-- Top Tab Bar -->
        <div class="ai-tabs-header">
          <button class="ai-tab-btn ${this.currentTab === 'chat' ? 'active' : ''}" onclick="AiAssistantPage.switchTab('chat')">
            <span class="ai-tab-icon">💬</span> AI HR Copilot
          </button>
          ${isAdmin ? `
            <button class="ai-tab-btn ${this.currentTab === 'burnout' ? 'active' : ''}" onclick="AiAssistantPage.switchTab('burnout')">
              <span class="ai-tab-icon">🔥</span> Wellbeing & Burnout Predictor
            </button>
            <button class="ai-tab-btn ${this.currentTab === 'generator' ? 'active' : ''}" onclick="AiAssistantPage.switchTab('generator')">
              <span class="ai-tab-icon">✨</span> AI HR Content Studio
            </button>
          ` : ''}
          <button class="ai-tab-btn ${this.currentTab === 'policies' ? 'active' : ''}" onclick="AiAssistantPage.switchTab('policies')">
            <span class="ai-tab-icon">📖</span> Smart HR Knowledge Base
          </button>
        </div>

        <!-- Tab Body Content -->
        <div class="ai-tab-body" id="ai-tab-body">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    this.renderCurrentTab();
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.ai-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${tab}'`));
    });
    this.renderCurrentTab();
  },

  renderCurrentTab() {
    if (this.currentTab === 'chat') this.renderChatView();
    else if (this.currentTab === 'burnout') this.renderBurnoutView();
    else if (this.currentTab === 'generator') this.renderGeneratorView();
    else if (this.currentTab === 'policies') this.renderPoliciesView();
  },

  // ═══════════════════════════════════════════════════════════════
  // TAB 1: AI CONVERSATIONAL CHATBOT
  // ═══════════════════════════════════════════════════════════════
  async renderChatView() {
    const body = document.getElementById('ai-tab-body');
    const isAdmin = App.isAdminOrHR();

    body.innerHTML = `
      <div class="ai-chat-wrapper">
        <!-- Chat Header Banner -->
        <div class="ai-chat-header">
          <div class="ai-bot-identity">
            <div class="ai-bot-avatar">🤖</div>
            <div>
              <div class="ai-bot-name">EMS Pro AI Assistant</div>
              <div class="ai-bot-subtext">
                <span class="status-indicator online"></span> Powered by Gemini AI • Role: <strong>${App.user.role.toUpperCase()}</strong>
              </div>
            </div>
          </div>
          <div class="ai-chat-header-actions">
            <button class="btn btn-sm btn-ghost ${this.ttsEnabled ? 'active-voice' : ''}" id="tts-toggle-btn" onclick="AiAssistantPage.toggleTTS()" title="Toggle voice narration">
              ${this.ttsEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
            </button>
            <button class="btn btn-sm btn-ghost" onclick="AiAssistantPage.clearChatHistory()" title="Clear conversation history">
              🗑️ Clear
            </button>
          </div>
        </div>

        <!-- Chat Messages Stream -->
        <div class="ai-chat-messages" id="ai-chat-messages">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>

        <!-- Prompt Suggestions -->
        <div class="ai-quick-chips">
          ${this.renderQuickChips()}
        </div>

        <!-- Chat Input Form -->
        <form class="ai-chat-input-bar" id="ai-chat-form" onsubmit="AiAssistantPage.handleSend(event)">
          <button type="button" class="ai-voice-btn" id="ai-voice-btn" onclick="AiAssistantPage.toggleVoiceInput()" title="Speak to AI">
            🎙️
          </button>
          <input 
            type="text" 
            id="ai-chat-input" 
            class="ai-input-field" 
            placeholder="Ask about leaves, attendance, payroll, policies, or type 'Apply leave'..." 
            autocomplete="off"
          />
          <button type="submit" class="btn btn-primary ai-send-btn" id="ai-send-btn">
            <span>Send</span> ⚡
          </button>
        </form>
      </div>
    `;

    await this.loadChatHistory();
  },

  renderQuickChips() {
    const isAdmin = App.isAdminOrHR();
    const commonChips = [
      { label: '🏖️ Leave Balance', prompt: 'What is my current leave balance?' },
      { label: '⏰ Today\'s Attendance', prompt: 'Show my attendance status for today' },
      { label: '💰 My Payslip Breakdown', prompt: 'Show my latest salary payslip details' },
      { label: '📖 Standard Office Hours', prompt: 'What are the company working hours and late policy?' },
      { label: '🩺 Sick Leave Policy', prompt: 'What is the policy for applying sick leave?' }
    ];

    const adminChips = [
      { label: '👥 Workforce Headcount', prompt: 'Give me the total headcount and department breakdown' },
      { label: '⏳ Pending Leave Requests', prompt: 'List all pending leave requests requiring approval' },
      { label: '💼 Payroll Overview', prompt: 'Show payroll summary and pending payouts' }
    ];

    const chips = isAdmin ? [...adminChips, ...commonChips.slice(0, 3)] : commonChips;
    return chips.map(c => `
      <button type="button" class="ai-chip" onclick="AiAssistantPage.sendQuickPrompt('${c.prompt.replace(/'/g, "\\'")}')">
        ${c.label}
      </button>
    `).join('');
  },

  async loadChatHistory() {
    const container = document.getElementById('ai-chat-messages');
    try {
      const data = await AiAPI.getHistory();
      container.innerHTML = '';

      if (!data.history || data.history.length === 0) {
        this.appendWelcomeMessage();
        return;
      }

      data.history.forEach(item => {
        this.appendMessageUI(item.role, item.message, item.action, false);
      });
      this.scrollToBottom();
    } catch (err) {
      console.error(err);
      container.innerHTML = '';
      this.appendWelcomeMessage();
    }
  },

  appendWelcomeMessage() {
    const container = document.getElementById('ai-chat-messages');
    const role = App.user.role;
    const welcome = `Hello **${App.user.username}**! 👋 I am your **EMS Pro AI Assistant**.\n\nI can assist you with:\n- 🏖️ **Leaves**: Check your balance or ask me how to apply\n- ⏰ **Attendance**: Check your clock-in status, say **"Clock in"** or **"Clock out"**\n- 💰 **Payroll**: Get instant salary breakdowns and deduction summaries\n- 📖 **Company Handbook**: Ask any question about office hours, leave rules, or benefits\n${role !== 'employee' ? '- ⚡ **HR Powers**: Review and approve pending leaves directly from chat cards!' : ''}\n\nHow can I help you today?`;
    this.appendMessageUI('model', welcome, null, false);
  },

  appendMessageUI(role, message, action = null, scroll = true) {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;

    const isUser = role === 'user';
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-message-row ${isUser ? 'user-row' : 'bot-row'}`;

    const avatar = isUser ? (App.user.username[0] || 'U').toUpperCase() : '🤖';
    const formattedContent = this.formatMarkdown(message);

    let actionCardHtml = '';
    if (action) {
      actionCardHtml = this.renderActionCard(action);
    }

    msgDiv.innerHTML = `
      <div class="ai-msg-avatar ${isUser ? 'user-avatar-badge' : 'bot-avatar-badge'}">${avatar}</div>
      <div class="ai-msg-bubble ${isUser ? 'user-bubble' : 'bot-bubble'}">
        <div class="ai-msg-text">${formattedContent}</div>
        ${actionCardHtml}
      </div>
    `;

    container.appendChild(msgDiv);
    if (scroll) this.scrollToBottom();
  },

  renderActionCard(action) {
    if (!action || !action.type) return '';

    // 1. Leave Balance Card
    if (action.type === 'leave_balance_card' && action.data) {
      const bal = action.data;
      return `
        <div class="ai-card ai-leave-card">
          <div class="ai-card-title">🌴 Leave Balance Breakdown (${new Date().getFullYear()})</div>
          <div class="ai-card-grid">
            <div class="ai-stat-box">
              <span class="ai-stat-label">Sick Leave</span>
              <span class="ai-stat-val text-success">${bal.sick.remaining} / ${bal.sick.total}</span>
              <span class="ai-stat-sub">${bal.sick.used} used</span>
            </div>
            <div class="ai-stat-box">
              <span class="ai-stat-label">Casual Leave</span>
              <span class="ai-stat-val text-info">${bal.casual.remaining} / ${bal.casual.total}</span>
              <span class="ai-stat-sub">${bal.casual.used} used</span>
            </div>
            <div class="ai-stat-box">
              <span class="ai-stat-label">Annual Leave</span>
              <span class="ai-stat-val text-warning">${bal.annual.remaining} / ${bal.annual.total}</span>
              <span class="ai-stat-sub">${bal.annual.used} used</span>
            </div>
          </div>
          <button class="btn btn-sm btn-outline mt-1" onclick="App.navigate('leaves')">
            Apply from Leave Portal →
          </button>
        </div>
      `;
    }

    // 2. Pending Leaves Card (HR/Admin interactive approval)
    if (action.type === 'pending_leaves_card' && Array.isArray(action.data)) {
      return `
        <div class="ai-card ai-pending-card">
          <div class="ai-card-title">⏳ Pending Leave Requests (${action.data.length})</div>
          <div class="ai-pending-list">
            ${action.data.map(l => `
              <div class="ai-pending-item" id="leave-item-${l._id}">
                <div class="ai-pending-info">
                  <strong>${l.employeeId ? l.employeeId.firstName + ' ' + l.employeeId.lastName : 'Employee'}</strong> 
                  <span class="badge badge-warning">${l.type.toUpperCase()}</span>
                  <div class="text-secondary" style="font-size:0.8rem">
                    ${App.formatDate(l.startDate)} - ${App.formatDate(l.endDate)} (${l.days} days)
                  </div>
                  <div class="text-muted" style="font-size:0.8rem">Reason: "${l.reason}"</div>
                </div>
                <div class="ai-pending-actions">
                  <button class="btn btn-xs btn-success" onclick="AiAssistantPage.handleApproveLeave('${l._id}')">✓ Approve</button>
                  <button class="btn btn-xs btn-danger" onclick="AiAssistantPage.handleRejectLeave('${l._id}')">✕ Reject</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 3. Attendance Status Card
    if (action.type === 'attendance_status' && action.data) {
      const att = action.data;
      return `
        <div class="ai-card ai-attendance-card">
          <div class="ai-card-title">⏱️ Today's Attendance Record</div>
          <div class="ai-card-row">
            <span>Status:</span>
            ${App.getStatusBadge(att.status || 'present')}
          </div>
          <div class="ai-card-row">
            <span>Check In:</span>
            <strong>${att.checkIn ? new Date(att.checkIn).toLocaleTimeString() : 'Not clocked in'}</strong>
          </div>
          <div class="ai-card-row">
            <span>Check Out:</span>
            <strong>${att.checkOut ? new Date(att.checkOut).toLocaleTimeString() : 'Active'}</strong>
          </div>
          <div class="ai-card-row">
            <span>Total Hours:</span>
            <strong>${att.hoursWorked || 0} hrs</strong>
          </div>
        </div>
      `;
    }

    // 4. Payroll Card
    if (action.type === 'payroll_card' && action.data) {
      const p = action.data;
      return `
        <div class="ai-card ai-payroll-card">
          <div class="ai-card-title">💳 Payslip Breakdown</div>
          <div class="ai-card-row">
            <span>Basic Salary:</span>
            <strong>${App.formatCurrency(p.basicSalary)}</strong>
          </div>
          <div class="ai-card-row">
            <span>Gross Salary:</span>
            <strong>${App.formatCurrency(p.grossSalary)}</strong>
          </div>
          <div class="ai-card-row text-danger">
            <span>Total Deductions:</span>
            <strong>-${App.formatCurrency(p.totalDeductions)}</strong>
          </div>
          <div class="ai-card-row text-success" style="font-size:1.05rem;border-top:1px solid var(--border-color);padding-top:0.4rem;margin-top:0.4rem">
            <span>Net Take-Home:</span>
            <strong>${App.formatCurrency(p.netPay)}</strong>
          </div>
        </div>
      `;
    }

    return '';
  },

  async handleApproveLeave(leaveId) {
    try {
      await LeaveAPI.approve(leaveId, { comment: 'Approved via AI Assistant' });
      App.showToast('Leave request approved!', 'success');
      const item = document.getElementById(`leave-item-${leaveId}`);
      if (item) {
        item.innerHTML = `<span class="text-success">✓ Approved successfully</span>`;
      }
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async handleRejectLeave(leaveId) {
    try {
      await LeaveAPI.reject(leaveId, { comment: 'Rejected via AI Assistant' });
      App.showToast('Leave request rejected', 'warning');
      const item = document.getElementById(`leave-item-${leaveId}`);
      if (item) {
        item.innerHTML = `<span class="text-danger">✕ Rejected</span>`;
      }
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async handleSend(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('ai-chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';
    this.appendMessageUI('user', msg, null, true);

    // Show typing indicator
    const typingId = this.showTypingIndicator();

    try {
      const data = await AiAPI.chat(msg);
      this.removeTypingIndicator(typingId);
      this.appendMessageUI('model', data.message, data.action, true);

      if (this.ttsEnabled) {
        this.speakText(data.message);
      }
    } catch (err) {
      this.removeTypingIndicator(typingId);
      this.appendMessageUI('model', `⚠️ Error: ${err.message}`, null, true);
    }
  },

  sendQuickPrompt(promptText) {
    const input = document.getElementById('ai-chat-input');
    if (input) {
      input.value = promptText;
      this.handleSend();
    }
  },

  showTypingIndicator() {
    const container = document.getElementById('ai-chat-messages');
    const typingDiv = document.createElement('div');
    const id = 'typing-' + Date.now();
    typingDiv.id = id;
    typingDiv.className = 'ai-message-row bot-row';
    typingDiv.innerHTML = `
      <div class="ai-msg-avatar bot-avatar-badge">🤖</div>
      <div class="ai-msg-bubble bot-bubble typing-bubble">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    `;
    container.appendChild(typingDiv);
    this.scrollToBottom();
    return id;
  },

  removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  },

  scrollToBottom() {
    const container = document.getElementById('ai-chat-messages');
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
    }
  },

  async clearChatHistory() {
    if (!confirm('Clear all conversation history?')) return;
    try {
      await AiAPI.clearHistory();
      App.showToast('Chat history cleared', 'info');
      this.loadChatHistory();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  // ─── Voice Speech-to-Text (STT) ───────────────────────────
  toggleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      App.showToast('Speech recognition is not supported in this browser.', 'warning');
      return;
    }

    const btn = document.getElementById('ai-voice-btn');

    if (this.isListening) {
      if (this.recognition) this.recognition.stop();
      this.isListening = false;
      btn?.classList.remove('listening');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      btn?.classList.add('listening');
      App.showToast('Listening... Speak now 🎙️', 'info');
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const input = document.getElementById('ai-chat-input');
      if (input) {
        input.value = transcript;
        this.handleSend();
      }
    };

    this.recognition.onerror = (e) => {
      console.warn('Speech recognition error:', e.error);
      this.isListening = false;
      btn?.classList.remove('listening');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      btn?.classList.remove('listening');
    };

    this.recognition.start();
  },

  // ─── Voice Text-to-Speech (TTS) ───────────────────────────
  toggleTTS() {
    this.ttsEnabled = !this.ttsEnabled;
    const btn = document.getElementById('tts-toggle-btn');
    if (btn) {
      btn.textContent = this.ttsEnabled ? '🔊 Voice On' : '🔇 Voice Off';
      btn.classList.toggle('active-voice', this.ttsEnabled);
    }
    if (!this.ttsEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    App.showToast(`Voice narration ${this.ttsEnabled ? 'enabled' : 'disabled'}`, 'info');
  },

  speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // Clean markdown before speaking
    const cleanText = text
      .replace(/[*#_`>]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/https?:\/\/\S+/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  },

  // ─── Markdown Formatter ───────────────────────────────────
  formatMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h4 class="ai-md-h4">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="ai-md-h3">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="ai-md-h2">$1</h2>');

    // Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code blocks & inline code
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="ai-code-block"><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');

    // Unordered lists
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="ai-list-item">$1</li>');
    html = html.replace(/(<li class="ai-list-item">.*<\/li>)/gim, '<ul>$1</ul>');

    // Line breaks
    html = html.replace(/\n\n/g, '<br/><br/>');
    html = html.replace(/\n/g, '<br/>');

    return html;
  },

  // ═══════════════════════════════════════════════════════════════
  // TAB 2: HR INNOVATION - BURNOUT & RETENTION RISK PREDICTOR
  // ═══════════════════════════════════════════════════════════════
  async renderBurnoutView() {
    const body = document.getElementById('ai-tab-body');
    body.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    try {
      const data = await AiAPI.getBurnoutRisk();
      const s = data.summary;

      body.innerHTML = `
        <div class="ai-burnout-container">
          <div class="ai-section-header">
            <div>
              <h3>🔥 Employee Wellbeing & Burnout Risk Predictor</h3>
              <p class="text-secondary">AI-driven predictive retention analytics based on working hours, overtime trends, late frequency, and leave balance utilization.</p>
            </div>
            <button class="btn btn-sm btn-ghost" onclick="AiAssistantPage.renderBurnoutView()">🔄 Refresh Data</button>
          </div>

          <!-- Summary Metric Cards -->
          <div class="stats-grid mb-3">
            <div class="stat-card">
              <div class="stat-label">Employees Evaluated</div>
              <div class="stat-value">${s.totalEvaluated}</div>
              <div class="stat-change text-info">30-day activity window</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--accent-danger)">
              <div class="stat-label">High Burnout Risk</div>
              <div class="stat-value text-danger">${s.highRisk}</div>
              <div class="stat-change text-danger">Requires immediate check-in</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--accent-warning)">
              <div class="stat-label">Moderate Risk</div>
              <div class="stat-value text-warning">${s.moderateRisk}</div>
              <div class="stat-change text-warning">Monitor workload</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--accent-success)">
              <div class="stat-label">Healthy Balance</div>
              <div class="stat-value text-success">${s.healthy}</div>
              <div class="stat-change text-success">Optimal workload</div>
            </div>
          </div>

          <!-- Employee Risk Table -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Employee Fatigue & Retention Risk Index</div>
            </div>
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Avg Daily Hrs</th>
                    <th>Late Marks</th>
                    <th>Leaves Taken</th>
                    <th>Fatigue Risk Score</th>
                    <th>Key Risk Factors</th>
                    <th>AI Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.employees.map(emp => {
                    const badgeClass = emp.riskLevel === 'High' ? 'badge-danger' : emp.riskLevel === 'Moderate' ? 'badge-warning' : 'badge-success';
                    return `
                      <tr>
                        <td>
                          <strong>${emp.name}</strong>
                          <div class="text-muted" style="font-size:0.75rem">${emp.position}</div>
                        </td>
                        <td>${emp.department}</td>
                        <td><strong>${emp.avgDailyHours} hrs</strong></td>
                        <td>${emp.lateCount}</td>
                        <td>${emp.leaveDaysTaken} days</td>
                        <td>
                          <div class="risk-bar-wrapper">
                            <span class="badge ${badgeClass}">${emp.riskLevel} (${emp.riskScore}%)</span>
                            <div class="risk-bar-track">
                              <div class="risk-bar-fill risk-${emp.riskLevel.toLowerCase()}" style="width:${emp.riskScore}%"></div>
                            </div>
                          </div>
                        </td>
                        <td>
                          ${emp.riskFactors.length > 0 
                            ? emp.riskFactors.map(f => `<span class="ai-risk-tag">${f}</span>`).join(' ') 
                            : '<span class="text-success" style="font-size:0.8rem">No risk indicators</span>'}
                        </td>
                        <td style="max-width:280px;font-size:0.85rem">
                          ${emp.recommendation}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      body.innerHTML = `<div class="empty-state"><h3>⚠️ Failed to load burnout analytics</h3><p>${err.message}</p></div>`;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // TAB 3: HR INNOVATION - AI CONTENT STUDIO
  // ═══════════════════════════════════════════════════════════════
  renderGeneratorView() {
    const body = document.getElementById('ai-tab-body');
    body.innerHTML = `
      <div class="ai-generator-container">
        <div class="ai-section-header">
          <div>
            <h3>✨ AI HR Content Studio</h3>
            <p class="text-secondary">Draft polished Job Descriptions, Performance Reviews, and Company Announcements in seconds using Gemini AI.</p>
          </div>
        </div>

        <div class="ai-generator-layout">
          <!-- Left Controls Card -->
          <div class="card ai-gen-controls">
            <div class="form-group mb-2">
              <label class="form-label">Generation Mode</label>
              <select class="form-control" id="gen-type-select" onchange="AiAssistantPage.handleGenTypeChange(this.value)">
                <option value="job_description" ${this.generatorType === 'job_description' ? 'selected' : ''}>📋 Job Description (JD) Generator</option>
                <option value="performance_review" ${this.generatorType === 'performance_review' ? 'selected' : ''}>🌟 Performance Appraisal Review</option>
                <option value="announcement" ${this.generatorType === 'announcement' ? 'selected' : ''}>📢 Company-wide Announcement</option>
              </select>
            </div>

            <form id="ai-generator-form" onsubmit="AiAssistantPage.executeGenerate(event)">
              <div id="gen-dynamic-fields">
                ${this.renderGeneratorFields()}
              </div>
              <button type="submit" class="btn btn-primary btn-block mt-2" id="gen-submit-btn">
                <span>Generate Content</span> ✨
              </button>
            </form>
          </div>

          <!-- Right Preview Card -->
          <div class="card ai-gen-preview">
            <div class="card-header" style="justify-content:space-between">
              <div class="card-title">Generated Output</div>
              <div style="display:flex;gap:0.5rem">
                <button class="btn btn-sm btn-ghost" onclick="AiAssistantPage.copyGeneratedContent()" id="copy-btn">📋 Copy</button>
              </div>
            </div>
            <div class="ai-preview-body" id="ai-preview-body">
              <div class="ai-preview-placeholder">
                <div style="font-size:2.5rem;margin-bottom:0.5rem">🪄</div>
                <p>Fill in the parameters on the left and click <strong>Generate Content</strong> to draft professional HR documents.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  handleGenTypeChange(type) {
    this.generatorType = type;
    const container = document.getElementById('gen-dynamic-fields');
    if (container) {
      container.innerHTML = this.renderGeneratorFields();
    }
  },

  renderGeneratorFields() {
    if (this.generatorType === 'job_description') {
      return `
        <div class="form-group mb-1">
          <label class="form-label">Job Title *</label>
          <input type="text" id="jd-title" class="form-control" placeholder="e.g. Senior Frontend Engineer" required />
        </div>
        <div class="form-group mb-1">
          <label class="form-label">Department *</label>
          <select id="jd-dept" class="form-control" required>
            <option value="Engineering">Engineering</option>
            <option value="Marketing">Marketing</option>
            <option value="Sales">Sales</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Finance">Finance</option>
            <option value="Design">Design</option>
            <option value="Operations">Operations</option>
          </select>
        </div>
        <div class="form-group mb-1">
          <label class="form-label">Experience Required</label>
          <input type="text" id="jd-exp" class="form-control" placeholder="e.g. 3-5 years" value="3-5 years" />
        </div>
        <div class="form-group mb-1">
          <label class="form-label">Key Skills & Technologies</label>
          <textarea id="jd-skills" class="form-control" rows="3" placeholder="e.g. React, TypeScript, Node.js, REST APIs, Git"></textarea>
        </div>
      `;
    }

    if (this.generatorType === 'performance_review') {
      return `
        <div class="form-group mb-1">
          <label class="form-label">Employee Name *</label>
          <input type="text" id="pr-name" class="form-control" placeholder="e.g. Rahul Sharma" required />
        </div>
        <div class="form-group mb-1">
          <label class="form-label">Role & Department</label>
          <input type="text" id="pr-role" class="form-control" placeholder="e.g. Lead Developer, Engineering" value="Software Engineer, Engineering" />
        </div>
        <div class="form-group mb-1">
          <label class="form-label">Overall Rating (1 - 5)</label>
          <select id="pr-rating" class="form-control">
            <option value="5.0 - Outstanding">5.0 - Outstanding</option>
            <option value="4.5 - Exceeds Expectations" selected>4.5 - Exceeds Expectations</option>
            <option value="4.0 - Consistently Meets Expectations">4.0 - Meets Expectations</option>
            <option value="3.0 - Needs Development">3.0 - Needs Development</option>
          </select>
        </div>
        <div class="form-group mb-1">
          <label class="form-label">Major Achievements</label>
          <textarea id="pr-achieve" class="form-control" rows="2" placeholder="e.g. Led migration to modern microservices; mentored 2 interns"></textarea>
        </div>
        <div class="form-group mb-1">
          <label class="form-label">Areas for Growth</label>
          <textarea id="pr-growth" class="form-control" rows="2" placeholder="e.g. Enhance cross-functional communication and proactive documentation"></textarea>
        </div>
      `;
    }

    if (this.generatorType === 'announcement') {
      return `
        <div class="form-group mb-1">
          <label class="form-label">Announcement Title / Topic *</label>
          <input type="text" id="an-title" class="form-control" placeholder="e.g. Upcoming Diwali Celebration & Holiday Notice" required />
        </div>
        <div class="form-group mb-1">
          <label class="form-label">Target Audience</label>
          <input type="text" id="an-audience" class="form-control" value="All Employees" />
        </div>
        <div class="form-group mb-1">
          <label class="form-label">Effective Date</label>
          <input type="text" id="an-date" class="form-control" value="Next Monday" />
        </div>
        <div class="form-group mb-1">
          <label class="form-label">Key Message Details</label>
          <textarea id="an-details" class="form-control" rows="3" placeholder="e.g. Office will be closed on Friday. Sweet distribution in cafeteria on Thursday at 4 PM."></textarea>
        </div>
      `;
    }

    return '';
  },

  async executeGenerate(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('gen-submit-btn');
    const preview = document.getElementById('ai-preview-body');

    let payload = {};
    if (this.generatorType === 'job_description') {
      payload = {
        title: document.getElementById('jd-title').value,
        department: document.getElementById('jd-dept').value,
        experience: document.getElementById('jd-exp').value,
        keySkills: document.getElementById('jd-skills').value
      };
    } else if (this.generatorType === 'performance_review') {
      payload = {
        employeeName: document.getElementById('pr-name').value,
        position: document.getElementById('pr-role').value,
        department: 'Corporate',
        rating: document.getElementById('pr-rating').value,
        achievements: document.getElementById('pr-achieve').value,
        improvementAreas: document.getElementById('pr-growth').value
      };
    } else if (this.generatorType === 'announcement') {
      payload = {
        title: document.getElementById('an-title').value,
        audience: document.getElementById('an-audience').value,
        eventDate: document.getElementById('an-date').value,
        details: document.getElementById('an-details').value
      };
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Crafting with AI...</span> <div class="spinner-sm"></div>';
    preview.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    try {
      const data = await AiAPI.generate(this.generatorType, payload);
      this.lastGeneratedContent = data.content;
      preview.innerHTML = `
        <div class="ai-generated-markdown">
          ${this.formatMarkdown(data.content)}
        </div>
      `;
      App.showToast('Content generated successfully!', 'success');
    } catch (err) {
      preview.innerHTML = `<div class="text-danger">⚠️ Generation failed: ${err.message}</div>`;
      App.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Generate Content</span> ✨';
    }
  },

  copyGeneratedContent() {
    if (!this.lastGeneratedContent) {
      App.showToast('No content generated to copy.', 'warning');
      return;
    }
    navigator.clipboard.writeText(this.lastGeneratedContent);
    App.showToast('Copied to clipboard!', 'success');
  },

  // ═══════════════════════════════════════════════════════════════
  // TAB 4: SMART POLICIES KNOWLEDGE BASE
  // ═══════════════════════════════════════════════════════════════
  async renderPoliciesView() {
    const body = document.getElementById('ai-tab-body');
    body.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    try {
      const data = await AiAPI.getPolicies();
      this.policyList = data.policies || [];

      body.innerHTML = `
        <div class="ai-policies-container">
          <div class="ai-section-header">
            <div>
              <h3>📖 EMS Pro Smart HR Policy Handbook</h3>
              <p class="text-secondary">Official company guidelines, leave entitlements, payroll breakdown, and workplace conduct.</p>
            </div>
            <div class="search-box" style="max-width:300px">
              <input 
                type="text" 
                id="policy-search" 
                placeholder="Search policies..." 
                oninput="AiAssistantPage.filterPolicies(this.value)" 
              />
            </div>
          </div>

          <div class="ai-policies-grid" id="ai-policies-grid">
            ${this.renderPolicyCards(this.policyList)}
          </div>
        </div>
      `;
    } catch (err) {
      body.innerHTML = `<div class="empty-state"><h3>⚠️ Failed to load policies</h3></div>`;
    }
  },

  renderPolicyCards(policies) {
    if (!policies || policies.length === 0) {
      return '<div class="empty-state">No matching company policies found.</div>';
    }

    return policies.map(p => `
      <div class="card policy-card">
        <div class="policy-category-tag">${p.category}</div>
        <h4 class="policy-title">${p.title}</h4>
        <p class="policy-content">${p.content}</p>
        <button class="btn btn-sm btn-outline mt-2" onclick="AiAssistantPage.askAboutPolicy('${p.title.replace(/'/g, "\\'")}')">
          Ask Copilot about this →
        </button>
      </div>
    `).join('');
  },

  filterPolicies(query) {
    const q = (query || '').toLowerCase();
    const filtered = this.policyList.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) || 
      p.content.toLowerCase().includes(q)
    );
    const grid = document.getElementById('ai-policies-grid');
    if (grid) grid.innerHTML = this.renderPolicyCards(filtered);
  },

  askAboutPolicy(policyTitle) {
    this.switchTab('chat');
    setTimeout(() => {
      this.sendQuickPrompt(`Tell me more about the "${policyTitle}" policy.`);
    }, 100);
  }
};

