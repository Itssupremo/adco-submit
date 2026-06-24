import axios from 'axios';

const rawBaseUrl = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || '/api').trim();
const baseURL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

const API = axios.create({ baseURL });

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (data) => API.post('/auth/login', data);
export const loginByEmail = (email) => API.post('/auth/login-by-email', { email });
export const getMe = () => API.get('/auth/me');

// SUCs — authenticated
export const getSucs = () => API.get('/sucs');
export const createSuc = (data) => API.post('/sucs', data);
export const updateSuc = (id, data) => API.put(`/sucs/${id}`, data);
export const deleteSuc = (id) => API.delete(`/sucs/${id}`);
export const transferSuc = (id, data) => API.put(`/sucs/${id}/transfer`, data);

// SUCs — public
export const getPublicSucs = (region) =>
  API.get('/sucs/public', { params: region ? { region } : {} });
export const getOccOfficials = () => API.get('/sucs/occ-officials');

// Users — admin only
export const getUsers = () => API.get('/users');
export const createUser = (data) => API.post('/users', data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const deleteUser = (id) => API.delete(`/users/${id}`);

// Self profile update — available to all roles
export const updateSelf = (data) => API.put('/users/me', data);

// Board Meeting Reminders (dateboardmeetings collection)
export const getDateBoardMeetings = () => API.get('/dateboardmeetings');
export const createDateBoardMeeting = (data) => API.post('/dateboardmeetings', data);
export const updateDateBoardMeeting = (id, data) => API.put(`/dateboardmeetings/${id}`, data);
export const deleteDateBoardMeeting = (id) => API.delete(`/dateboardmeetings/${id}`);

// Agendas
export const getAgendas = (sucId, year) =>
  API.get('/agendas', { params: { sucId, year } });

export const getAgendaStatusAll = () => API.get('/agendas/status');

export const uploadAgendaFiles = (sucId, quarter, formData) =>
  API.post(`/agendas/${sucId}/${quarter}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const resetAgenda = (sucId, quarter, year) =>
  API.delete(`/agendas/${sucId}/${quarter}`, { params: { year } });

export const getAgendaFileUrl = (agendaId, type) =>
  `${baseURL}/agendas/file/${agendaId}/${type}`;

export const getDocs = (sucId, year, pageType) =>
  API.get('/documents', { params: { sucId, year, pageType } });
export const uploadDoc = (sucId, pageType, slot, formData) =>
  API.post(`/documents/${sucId}/${pageType}/${slot}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const resetDoc = (sucId, pageType, slot, year) =>
  API.delete(`/documents/${sucId}/${pageType}/${slot}`, { params: { year } });

export default API;
