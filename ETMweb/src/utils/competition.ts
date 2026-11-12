import type { Member, Tournament } from '../types/management';
export const documentTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];
export function validDocument(file: File) {
  if (!documentTypes.includes(file.type))
    return 'Chỉ chấp nhận PDF, Word, PNG, JPEG, WebP, MP4, WebM hoặc MOV.';
  const maxMB = file.type.startsWith('video/') ? 50 : 10;
  if (file.size > maxMB * 1024 * 1024) return `Mỗi file không vượt quá ${maxMB} MB.`;
  return null;
}
export function isVideoUrl(url: string) {
  if (!safeDocumentUrl(url)) return false;
  const path = new URL(url).pathname;
  return /\.(mp4|webm|mov)$/i.test(path) || path.includes('/video/upload/');
}
export function safeDocumentUrl(url: string) {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}
export function eligibleMember(member: Member, tournament: Tournament) {
  return (
    member.status === 'Active' &&
    Date.parse(member.activeFrom) <= Date.parse(tournament.startAt) &&
    (!member.activeUntil || Date.parse(member.activeUntil) >= Date.parse(tournament.endAt))
  );
}
export function validScore(a: number, b: number, bestOf: number, official = false) {
  const wins = Math.floor(bestOf / 2) + 1;
  return (
    Number.isInteger(a) &&
    Number.isInteger(b) &&
    a >= 0 &&
    b >= 0 &&
    a !== b &&
    Math.max(a, b) <= wins &&
    (!official || Math.max(a, b) === wins)
  );
}
export function reorder<T>(items: T[], from: number, to: number) {
  const copy = [...items];
  if (from < 0 || to < 0 || from >= copy.length || to >= copy.length) return copy;
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
export function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function downloadCsv(name: string, rows: unknown[][]) {
  const blob = new Blob(['\ufeff' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
