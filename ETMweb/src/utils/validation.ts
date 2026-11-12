export const emailRule = {
  required: 'Vui lòng nhập email.',
  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email không hợp lệ.' },
};
export const nameRule = {
  required: 'Vui lòng nhập họ tên.',
  maxLength: { value: 120, message: 'Tối đa 120 ký tự.' },
  validate: (value: string) => value.trim().length >= 2 || 'Họ tên cần ít nhất 2 ký tự.',
};
export function passwordError(value: string) {
  if (value.length < 8) return 'Mật khẩu cần ít nhất 8 ký tự.';
  if (value.length > 128) return 'Mật khẩu không được vượt quá 128 ký tự.';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z\d]/.test(value))
    return 'Cần có chữ, số và ký tự đặc biệt.';
  return true;
}
export const passwordRule = { required: 'Vui lòng nhập mật khẩu.', validate: passwordError };
export function validateImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Chọn ảnh PNG, JPEG hoặc WebP.';
  if (file.size > 10 * 1024 * 1024) return 'Ảnh không được vượt quá 10 MB.';
  return null;
}
export function validateVideo(file: File) {
  if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type))
    return 'Chọn video MP4, WebM hoặc MOV.';
  if (file.size > 50 * 1024 * 1024) return 'Video không được vượt quá 50 MB.';
  return null;
}
