import { useEffect, useState } from 'react';
export function useCountdown(deadline?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = deadline ? Math.max(0, Date.parse(deadline) - now) : 0;
  return {
    locked: !!deadline && Date.parse(deadline) <= now,
    label: remaining
      ? `${Math.floor(remaining / 86400000)} ngày ${Math.floor(remaining / 3600000) % 24} giờ ${Math.floor(remaining / 60000) % 60} phút ${Math.floor(remaining / 1000) % 60} giây`
      : 'Đã đến hạn khóa roster',
  };
}
