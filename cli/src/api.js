const axios = require('axios');
const config = require('./config');

const API_URL = process.env.ENVGUARD_API_URL || 'https://env-guard-iota.vercel.app/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false, 
});

api.interceptors.request.use((req) => {
  const token = config.getToken();
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      console.error('Session expired. Please run `envguard login` again.');
      config.clearConfig();
    }
    return Promise.reject(err);
  }
);

module.exports = api;