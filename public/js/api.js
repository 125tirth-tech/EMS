// ═══════════════════════════════════════════════════════════════
// API Client - Centralized HTTP layer with JWT interceptor
// ═══════════════════════════════════════════════════════════════

const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
  }

  getToken() {
    return localStorage.getItem('ems_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired
          const currentUser = localStorage.getItem('ems_user');
          if (currentUser) {
            localStorage.removeItem('ems_token');
            localStorage.removeItem('ems_user');
            window.location.reload();
          }
        }
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw err;
    }
  }

  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url);
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

const api = new ApiClient();

// ─── Auth API ────────────────────────────────────────────────
const AuthAPI = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
  setPassword: (data) => api.post('/auth/set-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data)
};

// ─── Employee API ────────────────────────────────────────────
const EmployeeAPI = {
  getAll: (params) => api.get('/employees', params),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  getStats: () => api.get('/employees/stats'),
  getDepartments: () => api.get('/employees/departments')
};

// ─── Attendance API ──────────────────────────────────────────
const AttendanceAPI = {
  checkIn: () => api.post('/attendance/check-in', {}),
  checkOut: () => api.post('/attendance/check-out', {}),
  getToday: () => api.get('/attendance/today'),
  getMyHistory: (params) => api.get('/attendance/my-history', params),
  getAll: (params) => api.get('/attendance/all', params),
  markAttendance: (data) => api.post('/attendance/mark', data),
  getSummary: (params) => api.get('/attendance/summary', params)
};

// ─── Leave API ───────────────────────────────────────────────
const LeaveAPI = {
  apply: (data) => api.post('/leaves/apply', data),
  getMyLeaves: (params) => api.get('/leaves/my-leaves', params),
  getAll: (params) => api.get('/leaves/all', params),
  approve: (id, data) => api.put(`/leaves/${id}/approve`, data),
  reject: (id, data) => api.put(`/leaves/${id}/reject`, data),
  cancel: (id) => api.delete(`/leaves/${id}`)
};

// ─── Payroll API ─────────────────────────────────────────────
const PayrollAPI = {
  getAll: (params) => api.get('/payroll', params),
  getById: (id) => api.get(`/payroll/${id}`),
  generate: (data) => api.post('/payroll/generate', data),
  generateAll: (data) => api.post('/payroll/generate-all', data),
  update: (id, data) => api.put(`/payroll/${id}`, data),
  remove: (id) => api.delete(`/payroll/${id}`)
};

// ─── Notification API ────────────────────────────────────────
const NotificationAPI = {
  getAll: (params) => api.get('/notifications', params),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`, {}),
  markAllRead: () => api.put('/notifications/read-all', {}),
  remove: (id) => api.delete(`/notifications/${id}`),
  create: (data) => api.post('/notifications', data)
};

// ─── Document API ────────────────────────────────────────────
const DocumentAPI = {
  getAll: (params) => api.get('/documents', params),
  upload: (data) => api.post('/documents/upload', data),
  download: (id) => api.get(`/documents/${id}/download`),
  remove: (id) => api.delete(`/documents/${id}`)
};

// ─── AI & HR Innovation API ─────────────────────────────────
const AiAPI = {
  chat: (message) => api.post('/ai/chat', { message }),
  getHistory: () => api.get('/ai/history'),
  clearHistory: () => api.delete('/ai/history'),
  getPolicies: () => api.get('/ai/policies'),
  getBurnoutRisk: () => api.get('/ai/burnout-risk'),
  generate: (type, payload) => api.post('/ai/generate', { type, payload })
};

