import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../types';
import { QueryError, Spinner } from './ui';
export function ProtectedRoute({ role }: { role?: Role }) {
  const { status, user, error, reload } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Spinner label="Đang kiểm tra phiên đăng nhập…" />;
  if (status === 'error')
    return (
      <QueryError
        message={error || 'Không thể kiểm tra phiên đăng nhập.'}
        retry={() => {
          void reload().catch(() => undefined);
        }}
      />
    );
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (role && user.systemRole !== role) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
