import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL;
const baseURL = rawApiUrl
  ? (rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api/v1`)
  : 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('__taskflow_jwt');
    const expiry = localStorage.getItem('__taskflow_jwt_expiry');

    // Proactively verify token hasn't expired on the client before making request
    if (token && expiry && Date.now() > parseInt(expiry, 10)) {
      localStorage.removeItem('__taskflow_jwt');
      localStorage.removeItem('__taskflow_user');
      localStorage.removeItem('__taskflow_jwt_expiry');
      window.location.href = '/auth';
      return Promise.reject(new Error('Token expired locally'));
    }

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('__taskflow_jwt');
      localStorage.removeItem('__taskflow_user');
      localStorage.removeItem('__taskflow_jwt_expiry');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export default api;
