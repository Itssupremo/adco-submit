import axios from 'axios';

const rawBaseUrl = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || '/api').trim();
const baseURL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

const API = axios.create({ baseURL });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = (data) => API.post('/auth/login', data);
export const loginByEmail = (email) => API.post('/auth/login-by-email', { email });
export const getMe = () => API.get('/auth/me');

export const getUsers = () => API.get('/users');
export const createUser = (data) => API.post('/users', data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const deleteUser = (id) => API.delete(`/users/${id}`);
export const resetUserPassword = (id, password) => API.post(`/users/${id}/reset-password`, { password });
export const updateSelf = (data) => API.put('/users/me', data);

export const getCouncils = () => API.get('/councils');
export const createCouncil = (data) => API.post('/councils', data);
export const updateCouncil = (id, data) => API.put(`/councils/${id}`, data);
export const deleteCouncil = (id) => API.delete(`/councils/${id}`);

export const getActivityLogs = () => API.get('/logs');

export const getSubmissions = (params = {}) => API.get('/submissions', { params });
export const getMyCurrentSubmission = () => API.get('/submissions/my-current');
export const getSubmissionById = (id) => API.get(`/submissions/${id}`);
export const createSubmission = (formData) => API.post('/submissions', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const replaceSubmission = (id, formData) => API.put(`/submissions/${id}/replace`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const updateSubmissionReview = (id, data) => API.put(`/submissions/${id}/review`, data);
export const approveSubmission = (id, data = {}) => API.put(`/submissions/${id}/approve`, data);
export const returnSubmission = (id, remarks) => API.put(`/submissions/${id}/return`, { remarks });
export const archiveSubmission = (id) => API.put(`/submissions/${id}/archive`);
export const deleteSubmission = (id) => API.delete(`/submissions/${id}`);
export const getSubmissionFileUrl = (id, key, options = {}) => {
  const token = localStorage.getItem('token') || '';
  const params = new URLSearchParams({ token });
  if (key) params.set('key', key);
  if (options.index !== undefined && options.index !== null) params.set('index', String(options.index));
  if (options.version) params.set('v', String(options.version));
  return `${baseURL}/submissions/file/${id}?${params.toString()}`;
};

export const getNotifications = () => API.get('/notifications');
export const markNotificationRead = (id) => API.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => API.put('/notifications/read-all');

export const getSubmissionReports = (params = {}) => API.get('/reports/submissions', { params });
export const exportSubmissionReport = (params = {}, format = 'xlsx') =>
  API.get('/reports/submissions', { params: { ...params, format }, responseType: 'blob' });

export const getSettings = () => API.get('/settings');
export const updateSettings = (items) => API.put('/settings', { items });

export default API;
