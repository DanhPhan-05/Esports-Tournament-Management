import type { Account, AccountStatus, Role } from '../types';

export const roles: Role[] = ['Customer', 'ClubManager', 'TournamentOrganizer', 'Administrator'];
export const statuses: AccountStatus[] = ['Active', 'Pending', 'Locked', 'Suspended', 'Inactive'];
export const roleNames: Record<Role, string> = {
  Customer: 'Khách hàng',
  ClubManager: 'Quản lý CLB',
  TournamentOrganizer: 'Ban tổ chức',
  Administrator: 'Quản trị viên',
};
export const statusNames: Record<AccountStatus, string> = {
  Active: 'Hoạt động',
  Pending: 'Chờ kích hoạt',
  Locked: 'Đã khóa',
  Suspended: 'Tạm đình chỉ',
  Inactive: 'Vô hiệu hóa',
};
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((s) => s[0])
    .join('')
    .toUpperCase() || 'ET';
export const homeFor = (user: Account) =>
  ({
    Administrator: '/admin/dashboard',
    ClubManager: '/cm/dashboard',
    TournamentOrganizer: '/to/dashboard',
    Customer: '/',
  })[user.systemRole];
export const normalizeAccount = (user: Account) => ({ ...user, _id: user._id || user.id || '' });
export const formatDate = (date?: string | null, withTime = false) => {
  if (!date) return 'Chưa có';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Không xác định';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(parsed);
};
export function safeReturnTo(value: unknown, fallback: string) {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !/[\u0000-\u001f\u007f]/.test(value) &&
    !value.startsWith('/login')
    ? value
    : fallback;
}

export function loginDestination(value: unknown, user: Account) {
  const fallback = homeFor(user);
  const candidate = safeReturnTo(value, fallback);
  try {
    const pathname = decodeURIComponent(new URL(candidate, 'https://etm.invalid').pathname);
    if (/[\\\u0000-\u001f\u007f]/.test(pathname) || pathname.startsWith('//')) return fallback;
    const area = pathname.split('/')[1];
    if (area === 'dashboard') return fallback;
    const restricted: Record<string, Role[]> = {
      admin: ['Administrator'],
      cm: ['ClubManager'],
      to: ['TournamentOrganizer'],
      pickem: ['Customer'],
      applications: ['ClubManager', 'TournamentOrganizer'],
      protests: ['ClubManager', 'TournamentOrganizer'],
    };
    if (restricted[area] && !restricted[area].includes(user.systemRole)) return fallback;
    if (
      [
        'login',
        'register',
        'forgot-password',
        'reset-password',
        'activate',
        'verify-email',
        'oauth',
        'forbidden',
      ].includes(area)
    )
      return fallback;
    return candidate;
  } catch {
    return fallback;
  }
}
