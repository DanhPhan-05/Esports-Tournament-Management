import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { managementApi } from '../services/management';
export function NotificationBell() {
  const query = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => managementApi.notices({ limit: 1 }),
    refetchInterval: 60000,
  });
  return (
    <Link
      className="notification-bell icon-button"
      to="/notifications"
      aria-label={`Thông báo${query.data ? `, ${query.data.unread} chưa đọc` : ''}`}
    >
      <Bell size={19} />
      {!!query.data?.unread && <span>{query.data.unread > 99 ? '99+' : query.data.unread}</span>}
    </Link>
  );
}
