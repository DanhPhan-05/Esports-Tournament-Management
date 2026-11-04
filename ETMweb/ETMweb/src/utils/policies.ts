export const policyFields: Record<string, { key: string; label: string; min: number; max: number }[]> = {
  Password: [{ key: 'minLength', label: 'Độ dài mật khẩu tối thiểu', min: 8, max: 128 }],
  Login: [
    { key: 'maxAttempts', label: 'Số lần đăng nhập sai tối đa', min: 3, max: 10 },
    { key: 'lockMinutes', label: 'Thời gian tạm khóa (phút)', min: 5, max: 1440 },
  ],
  Session: [
    { key: 'maxAgeMinutes', label: 'Thời hạn phiên (phút)', min: 5, max: 10080 },
    { key: 'idleMinutes', label: 'Thời gian không hoạt động (phút)', min: 1, max: 1440 },
  ],
  RateLimit: [
    { key: 'windowSeconds', label: 'Khoảng thời gian (giây)', min: 1, max: 3600 },
    { key: 'maxRequests', label: 'Số yêu cầu tối đa', min: 5, max: 10000 },
  ],
};
export function policyError(category: string, config: Record<string, number>) {
  if (!policyFields[category]) return 'Loại chính sách không hợp lệ.';
  for (const f of policyFields[category])
    if (!Number.isInteger(config[f.key]) || config[f.key] < f.min || config[f.key] > f.max)
      return `${f.label}: cần số nguyên từ ${f.min} đến ${f.max}.`;
  if (category === 'Session' && config.idleMinutes > config.maxAgeMinutes)
    return 'Thời gian không hoạt động không được vượt thời hạn phiên.';
  return null;
}
export function policyPreview(category: string, c: Record<string, number>) {
  if (category === 'Password')
    return `Mật khẩu mới cần tối thiểu ${c.minLength} ký tự, kèm chữ, số và ký tự đặc biệt.`;
  if (category === 'Login') return `Sai ${c.maxAttempts} lần sẽ tạm khóa ${c.lockMinutes} phút.`;
  if (category === 'Session')
    return `Phiên tối đa ${c.maxAgeMinutes} phút; hết hạn sau ${c.idleMinutes} phút không hoạt động. Phiên hiện có được đánh giá lại ở lần kiểm tra tiếp theo.`;
  return `Tối đa ${c.maxRequests} yêu cầu trong ${c.windowSeconds} giây.`;
}
