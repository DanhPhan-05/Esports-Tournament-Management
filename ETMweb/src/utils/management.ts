import DOMPurify from 'dompurify';
export const cleanHtml = (value: string) =>
  DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 's'],
    ALLOWED_ATTR: [],
  });
export const localDate = (value?: string | null) =>
  value
    ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : '';
export function dateOrder(values: string[]) {
  return values.every(
    (value, index) =>
      Number.isFinite(Date.parse(value)) &&
      (index === 0 || Date.parse(value) >= Date.parse(values[index - 1])),
  );
}
export function banState(ban: { status: string; startsAt: string; endsAt: string | null }, now = Date.now()) {
  if (ban.status === 'Revoked') return 'Revoked';
  if (ban.status === 'Expired' || (ban.endsAt && Date.parse(ban.endsAt) <= now)) return 'Expired';
  return Date.parse(ban.startsAt) > now ? 'Scheduled' : 'Active';
}
export const pendingApplication = (status: string) =>
  ['Submitted', 'UnderReview', 'NeedMoreInfo'].includes(status);
export const statusLabel: Record<string, string> = {
  Scored: 'Đã chấm điểm',
  Resolved: 'Đã xử lý',
  Archived: 'Đã lưu trữ',
  Locked: 'Đã khóa',
  Pending: 'Chờ xử lý',
  Confirmed: 'Chính thức',
  Published: 'Đã công bố',
  Draft: 'Bản nháp',
  RegistrationOpen: 'Mở đăng ký',
  RegistrationClosed: 'Đóng đăng ký',
  Ongoing: 'Đang diễn ra',
  Completed: 'Hoàn tất',
  Postponed: 'Tạm hoãn',
  Cancelled: 'Đã hủy',
  Active: 'Hoạt động',
  Inactive: 'Ngừng hoạt động',
  Suspended: 'Tạm đình chỉ',
  Submitted: 'Đã nộp',
  UnderReview: 'Đang xét duyệt',
  NeedMoreInfo: 'Cần bổ sung',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
  Withdrawn: 'Đã rút',
  Revoked: 'Đã gỡ',
  Expired: 'Hết hạn',
  Scheduled: 'Đã lên lịch',
};
