import api from './client';

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Claims
export const claimsApi = {
  list: () => api.get('/claims'),
  get: (id) => api.get(`/claims/${id}`),
  create: (data) => api.post('/claims', data),
  update: (id, data) => api.put(`/claims/${id}`, data),
  delete: (id) => api.delete(`/claims/${id}`),
  submit: (id) => api.post(`/claims/${id}/submit`),
  approve: (id, data) => api.post(`/claims/${id}/approve`, data),
  reject: (id, data) => api.post(`/claims/${id}/reject`, data),
  startAudit: (id) => api.post(`/claims/${id}/start-audit`),
  auditApprove: (id, data) => api.post(`/claims/${id}/audit-approve`, data),
  auditReject: (id, data) => api.post(`/claims/${id}/audit-reject`, data),
};

// Items
export const itemsApi = {
  create: (claimId, data) => api.post(`/claims/${claimId}/items`, data),
  update: (claimId, itemId, data) => api.put(`/claims/${claimId}/items/${itemId}`, data),
  delete: (claimId, itemId) => api.delete(`/claims/${claimId}/items/${itemId}`),
};

// Receipts
export const receiptsApi = {
  upload: (claimId, itemId, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/claims/${claimId}/items/${itemId}/receipts`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getUrl: (id) => `/api/receipts/${id}`,
  delete: (id) => api.delete(`/receipts/${id}`),
};

// Comments
export const commentsApi = {
  list: (claimId) => api.get(`/claims/${claimId}/comments`),
  create: (claimId, data) => api.post(`/claims/${claimId}/comments`, data),
};

// Alerts
export const alertsApi = {
  list: (claimId) => api.get(`/claims/${claimId}/alerts`),
  resolve: (alertId) => api.put(`/alerts/${alertId}/resolve`),
};

// Notifications
export const notificationsApi = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// Batches
export const batchesApi = {
  list: () => api.get('/batches'),
  get: (id) => api.get(`/batches/${id}`),
  create: (data) => api.post('/batches', data),
  exportUrl: (id) => `/api/batches/${id}/export`,
};

// Reports
export const reportsApi = {
  summary: (month) => api.get('/reports/summary', { params: month ? { month } : {} }),
};
