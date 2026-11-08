import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { Account, AccountEdit, AccountFilters, ApiResponse, ProfileInput, StaffInput } from '../types';
import { normalizeAccount } from '../utils/account';

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
const messages: Record<string, string> = {
  'Invalid email or password': 'Email hoặc mật khẩu không chính xác.',
  'Account is temporarily locked':
    'Tài khoản đang tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.',
  'Account is not active': 'Tài khoản chưa được kích hoạt hoặc đã bị vô hiệu hóa.',
  'Account is banned': 'Tài khoản hiện đang bị hạn chế truy cập.',
  'Duplicate resource': 'Email hoặc dữ liệu này đã được sử dụng.',
  'Validation failed': 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại các trường đã nhập.',
  'Current password is incorrect': 'Mật khẩu hiện tại không chính xác.',
  'Password does not meet policy': 'Mật khẩu chưa đáp ứng chính sách bảo mật của hệ thống.',
  'New password does not meet policy': 'Mật khẩu mới chưa đáp ứng chính sách bảo mật của hệ thống.',
  'Invalid or expired reset token': 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
  'Invalid or expired activation token':
    'Liên kết kích hoạt không hợp lệ hoặc đã hết hạn. Hãy yêu cầu quản trị viên gửi lại.',
  'Invalid or expired verification token': 'Liên kết xác minh email không hợp lệ hoặc đã hết hạn.',
  'Storage is not configured':
    'Dịch vụ lưu ảnh chưa được cấu hình. Các thông tin khác vẫn có thể được cập nhật.',
  'Storage upload failed': 'Chưa thể tải file lên. Vui lòng thử lại.',
  'Cloudinary upload preset is not configured for unsigned uploads':
    'Cloudinary chưa có upload preset hợp lệ ở chế độ Unsigned.',
  'Unsupported upload file type': 'Định dạng file không được hỗ trợ.',
  'Upload file is empty': 'File tải lên không có nội dung.',
  'Images and documents are limited to 10 MB; videos to 50 MB':
    'Ảnh/tài liệu tối đa 10 MB, video tối đa 50 MB.',
  'A video is required': 'Vui lòng chọn file video.',
  'An image is required': 'Vui lòng chọn file ảnh.',
  Forbidden: 'Bạn không có quyền thực hiện thao tác này.',
  'Too many requests': 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi một lát rồi thử lại.',
  'Only pending accounts can be activated': 'Chỉ tài khoản đang chờ kích hoạt mới có thể nhận lại liên kết.',
  'Administrator cannot disable or demote their own account':
    'Bạn không thể tự khóa hoặc thay đổi vai trò quản trị của mình.',
};
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const raw = error.response?.data?.error?.message;
    const status = error.response?.status || 0;
    const retry = Number(error.response?.headers['retry-after']);
    const message = !status
      ? 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.'
      : status === 401 && !raw
        ? 'Phiên đăng nhập đã hết hạn.'
        : messages[raw] ||
          (status >= 500
            ? 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
            : raw || 'Không thể hoàn thành yêu cầu.');
    return new ApiError(message, status, Number.isFinite(retry) && retry > 0 ? retry : undefined);
  }
  return new ApiError(error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.');
}

const baseURL = import.meta.env.VITE_API_URL || '/api';
const options = { baseURL, withCredentials: true, timeout: 15000, headers: { Accept: 'application/json' } };
export const api = axios.create(options);
const transport = axios.create(options);
let csrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;
let refreshPromise: Promise<void> | null = null;
const expiredListeners = new Set<() => void>();
export function onSessionExpired(callback: () => void) {
  expiredListeners.add(callback);
  return () => {
    expiredListeners.delete(callback);
  };
}
export function resetTransportState() {
  csrfToken = null;
  csrfPromise = null;
  refreshPromise = null;
}
async function getCsrf(force = false): Promise<string> {
  if (csrfToken && !force) return csrfToken;
  if (!csrfPromise)
    csrfPromise = transport
      .get<ApiResponse<{ csrfToken: string }>>('/csrf-token')
      .then((r) => {
        csrfToken = r.data.data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfPromise = null;
      });
  return csrfPromise;
}
async function refreshSession() {
  if (!refreshPromise)
    refreshPromise = (async () => {
      try {
        await transport.post('/auth/refresh', {}, { headers: { 'X-CSRF-Token': await getCsrf() } });
      } catch (cause) {
        if (
          !axios.isAxiosError(cause) ||
          cause.response?.status !== 403 ||
          cause.response.data?.error?.message !== 'Invalid CSRF token'
        )
          throw cause;
        // A second tab may have renewed the shared CSRF cookie since this tab loaded.
        await transport.post('/auth/refresh', {}, { headers: { 'X-CSRF-Token': await getCsrf(true) } });
      }
    })().finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}
api.interceptors.request.use(async (config) => {
  if (!['get', 'head', 'options'].includes(config.method || 'get'))
    config.headers.set('X-CSRF-Token', await getCsrf());
  return config;
});
type RetryConfig = InternalAxiosRequestConfig & { retriedSession?: boolean; retriedCsrf?: boolean };
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: { message?: string } }>) => {
    const config = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    if (
      config &&
      status === 403 &&
      error.response?.data?.error?.message === 'Invalid CSRF token' &&
      !config.retriedCsrf
    ) {
      config.retriedCsrf = true;
      try {
        await getCsrf(true);
        return await api(config);
      } catch (cause) {
        throw toApiError(cause);
      }
    }
    const isAuthAction =
      /\/auth\/(login|register|logout|refresh|forgot-password|reset-password|activate|verify-email)/.test(
        config?.url || '',
      );
    if (config && status === 401 && !config.retriedSession && !isAuthAction) {
      config.retriedSession = true;
      try {
        await refreshSession();
        return await api(config);
      } catch (cause) {
        const failure = toApiError(cause);
        if ([400, 401, 403].includes(failure.status)) expiredListeners.forEach((callback) => callback());
        throw failure;
      }
    }
    if (status === 401 && config?.retriedSession) expiredListeners.forEach((callback) => callback());
    throw toApiError(error);
  },
);

const data = <T>(response: { data: ApiResponse<T> }) => response.data.data;
export const authApi = {
  login: (input: { email: string; password: string }) =>
    api.post<ApiResponse<{ user: Account }>>('/auth/login', input).then(data),
  register: (input: { email: string; fullName: string; password: string }) =>
    api.post('/auth/register', input),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<ApiResponse<Account>>('/users/me').then(data).then(normalizeAccount),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  activate: (token: string, password: string) => api.post('/auth/activate', { token, password }),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  googleUrl: `${baseURL.replace(/\/$/, '')}/auth/google`,
};
export const profileApi = {
  update: (input: Partial<ProfileInput>) =>
    api.patch<ApiResponse<Account>>('/users/me', input).then(data).then(normalizeAccount),
  password: (currentPassword: string, newPassword: string) =>
    api.post('/users/me/change-password', { currentPassword, newPassword }),
  avatar: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<ApiResponse<{ url: string }>>('/uploads?scope=avatar', form, { timeout: 180000 })
      .then(data);
  },
};
export const adminApi = {
  accounts: (filters: AccountFilters = {}) =>
    api.get<ApiResponse<Account[]>>('/admin/accounts', { params: filters }).then((r) => r.data),
  account: (id: string) =>
    api.get<ApiResponse<Account>>(`/admin/accounts/${id}`).then(data).then(normalizeAccount),
  create: (input: StaffInput) => api.post<ApiResponse<Account>>('/admin/accounts', input).then(data),
  update: (id: string, input: AccountEdit) =>
    api.put<ApiResponse<Account>>(`/admin/accounts/${id}`, input).then(data),
  disable: (id: string) => api.delete(`/admin/accounts/${id}`),
  resend: (id: string) => api.post(`/admin/accounts/${id}/resend-activation`),
  overview: async () => {
    const [accounts, pending, clubs, tournaments] = await Promise.all([
      adminApi.accounts({ limit: 5 }),
      adminApi.accounts({ status: 'Pending', limit: 1 }),
      api.get<ApiResponse<unknown[]>>('/admin/clubs').then(data),
      api.get<ApiResponse<unknown[]>>('/tournaments/my').then(data),
    ]);
    return {
      totalAccounts: accounts.pagination?.total || 0,
      pendingAccounts: pending.pagination?.total || 0,
      totalClubs: clubs.length,
      totalTournaments: tournaments.length,
      recentAccounts: accounts.data,
    };
  },
};
