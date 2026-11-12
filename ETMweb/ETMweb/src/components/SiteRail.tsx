import { Link, NavLink } from 'react-router-dom';
import {
  Menu,
  X,
  House,
  Trophy,
  Users,
  ChartNoAxesColumnIncreasing,
  Newspaper,
  Gamepad2,
  Target,
  History,
  Award,
  UserRound,
  Settings,
  Bell,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { homeFor } from '../utils/account';

export function SiteRail({
  open,
  onToggle,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const customer = user?.systemRole === 'Customer';
  const links = [
    { to: '/', label: 'Trang chủ', Icon: House },
    { to: '/tournaments', label: 'Giải đấu', Icon: Trophy },
    { to: '/clubs', label: 'Câu lạc bộ', Icon: Users },
    { to: '/standings', label: 'Xếp hạng', Icon: ChartNoAxesColumnIncreasing },
    { to: '/news', label: 'Tin tức', Icon: Newspaper },
    { to: '/games', label: 'Game', Icon: Gamepad2 },
    ...(!user || customer ? [{ to: '/pickem', label: 'Pick’em', Icon: Target }] : []),
  ];
  return (
    <>
      {open && <button className="site-rail-backdrop" aria-label="Đóng điều hướng" onClick={onClose} />}
      <aside className={`site-rail ${open ? 'expanded' : ''}`} aria-label="Điều hướng chính">
        <div className="site-rail-head">
          <Link to="/" aria-label="ETM — Trang chủ" onClick={onClose}>
            <img src="/logo.svg" alt="ETM" width={42} height={42} />
          </Link>
          <button
            className="site-rail-toggle"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls="site-navigation"
            aria-label={open ? 'Thu gọn điều hướng' : 'Mở rộng điều hướng'}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
        <nav id="site-navigation" className="site-rail-links" aria-label="Khám phá ETM">
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              end
              to={to}
              aria-label={label}
              title={!open ? label : undefined}
              onClick={onClose}
            >
              <Icon size={21} />
              <span className="site-rail-label">{label}</span>
            </NavLink>
          ))}
          {customer && (
            <>
              <div className="site-rail-divider" />
              {[
                { to: '/pickem/history', label: 'Dự đoán của tôi', Icon: History },
                { to: '/pickem/leaderboard', label: 'BXH Pick’em', Icon: Award },
              ].map(({ to, label, Icon }) => (
                <NavLink
                  end
                  key={to}
                  to={to}
                  aria-label={label}
                  title={!open ? label : undefined}
                  onClick={onClose}
                >
                  <Icon size={21} />
                  <span className="site-rail-label">{label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <nav className="site-rail-account" aria-label="Tài khoản">
          {user && user.systemRole !== 'Customer' && (
            <Link
              to={homeFor(user)}
              aria-label="Quản lý hệ thống"
              title={!open ? 'Quản lý hệ thống' : undefined}
            >
              <LayoutDashboard size={21} />
              <span className="site-rail-label">Quản lý</span>
            </Link>
          )}
          {user && (
            <>
              <NavLink
                to="/notifications"
                aria-label="Thông báo"
                title={!open ? 'Thông báo' : undefined}
                onClick={onClose}
              >
                <Bell size={21} />
                <span className="site-rail-label">Thông báo</span>
              </NavLink>
              <NavLink
                to="/profile"
                aria-label="Hồ sơ cá nhân"
                title={!open ? 'Hồ sơ cá nhân' : undefined}
                onClick={onClose}
              >
                <UserRound size={21} />
                <span className="site-rail-label">Hồ sơ cá nhân</span>
              </NavLink>
              <NavLink
                to="/settings"
                aria-label="Cài đặt tài khoản"
                title={!open ? 'Cài đặt tài khoản' : undefined}
                onClick={onClose}
              >
                <Settings size={21} />
                <span className="site-rail-label">Cài đặt tài khoản</span>
              </NavLink>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
