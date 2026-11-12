import { useEffect, useState } from 'react';
export function useDeadline(deadline: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  const left = Math.max(0, Date.parse(deadline) - now);
  return { locked: !Number.isFinite(left) || left <= 0, left };
}
export function CountdownTimer({ deadline }: { deadline: string }) {
  const { left, locked } = useDeadline(deadline);
  return (
    <span
      className={`countdown ${locked ? 'locked' : ''}`}
      role="timer"
      aria-label="Thời gian còn lại để dự đoán"
    >
      {locked
        ? 'Đã khóa dự đoán'
        : `${Math.floor(left / 86400000)}d ${String(Math.floor(left / 3600000) % 24).padStart(2, '0')}:${String(Math.floor(left / 60000) % 60).padStart(2, '0')}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`}
    </span>
  );
}
