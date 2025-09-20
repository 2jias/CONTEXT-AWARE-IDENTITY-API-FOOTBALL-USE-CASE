//src/utils/api.js
import axios from 'axios';

export const API_BASE =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({ baseURL: API_BASE });

let isRefreshing = false;
let queue = [];

//attach access token if present
api.interceptors.request.use((config) => {
  const at = localStorage.getItem('accessToken');
  if (at) config.headers.Authorization = `Bearer ${at}`;
  return config;
});

//helper: detect auth endpoints
const isAuthEndpoint = (cfg = {}) => {
  const url = (cfg.url || '');
  return (
    url.startsWith('/auth/login') ||
    url.startsWith('/auth/register') ||
    url.startsWith('/auth/refresh') ||
    url.startsWith('/auth/2fa')
  );
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config || {};

    //if it's a 401 from an AUTH endpoint, don't try to refresh — let caller handle it (e.g., 2FA_REQUIRED).
    if (err.response?.status === 401 && isAuthEndpoint(original)) {
      return Promise.reject(err);
    }

    //normal 401 flow: try refresh once, then replay
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const rt = localStorage.getItem('refreshToken');
          if (!rt) throw new Error('No refresh token');

          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken: rt });

          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          if (data.role) localStorage.setItem('role', data.role);

          //drain the queue
          queue.forEach((cb) => cb(data.accessToken));
          queue = [];

          //retry original
          original.headers = { ...(original.headers || {}), Authorization: `Bearer ${data.accessToken}` };
          return api(original);
        } catch (e) {
          queue = [];
          //hard logout on refresh failure (for non-auth endpoints)
          localStorage.clear();
          window.location.href = '/';
          return Promise.reject(e);
        } finally {
          isRefreshing = false;
        }
      }

      //wait for the inflight refresh, then replay
      return new Promise((resolve) => {
        queue.push((newAT) => {
          original.headers = { ...(original.headers || {}), Authorization: `Bearer ${newAT}` };
          resolve(api(original));
        });
      });
    }

    return Promise.reject(err);
  }
);

export default api;
