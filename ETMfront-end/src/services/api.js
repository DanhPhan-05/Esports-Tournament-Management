import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 10000,
});

let csrfToken;
export async function getCsrfToken() {
  if (!csrfToken) {
    const { data } = await api.get('/csrf');
    csrfToken = data.csrfToken;
  }
  return csrfToken;
}

api.interceptors.request.use(async (config) => {
  if (!['get', 'head', 'options'].includes(config.method?.toLowerCase())) {
    config.headers['X-CSRF-Token'] = await getCsrfToken();
  }
  return config;
});

api.interceptors.response.use((response) => response, async (error) => {
  if (error.response?.status === 403 && error.response?.data?.error?.code === 'INVALID_CSRF' && !error.config._csrfRetried) {
    csrfToken = undefined;
    error.config._csrfRetried = true;
    error.config.headers['X-CSRF-Token'] = await getCsrfToken();
    return api(error.config);
  }
  if (error.response?.status === 401) window.dispatchEvent(new Event('etm:unauthorized'));
  return Promise.reject(error);
});
