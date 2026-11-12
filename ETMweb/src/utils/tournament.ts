export const currencies = ['VND', 'USD', 'EUR', 'GBP', 'KRW', 'JPY', 'CNY', 'SGD', 'SAR'];
export function tournamentSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
export function prizeValues(value?: string, currency?: string) {
  const text = String(value ?? '').trim();
  const legacy = /^([\d,.\s]+)\s+([A-Z]{3})$/.exec(text);
  const amount = (legacy?.[1] || text).replace(/,/g, '').replace(/\s/g, '');
  return {
    prizePool: amount !== '' && Number.isFinite(Number(amount)) ? amount : '',
    prizeCurrency: currency || legacy?.[2] || '',
  };
}
export function formatPrize(t: { prizePool?: string; prizeCurrency?: string }) {
  if (t.prizePool == null || String(t.prizePool).trim() === '') return 'Chưa công bố';
  const values = prizeValues(t.prizePool, t.prizeCurrency);
  if (values.prizePool === '') return t.prizePool;
  if (!currencies.includes(values.prizeCurrency))
    return `${new Intl.NumberFormat('vi-VN').format(Number(values.prizePool))} (chưa chọn đơn vị)`;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: values.prizeCurrency,
    currencyDisplay: 'code',
  }).format(Number(values.prizePool));
}
export function registrationState(
  t: { status: string; registrationOpenAt: string; registrationCloseAt: string },
  now = Date.now(),
) {
  if (t.status !== 'RegistrationOpen' || now >= Date.parse(t.registrationCloseAt)) return 'closed';
  return now < Date.parse(t.registrationOpenAt) ? 'upcoming' : 'open';
}
