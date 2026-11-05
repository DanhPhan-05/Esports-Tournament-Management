import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  LayoutDashboard,
  Users,
  UserRound,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  ShieldCheck,
  Trophy,
  Gamepad2,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { Avatar, Button } from './ui';
import { homeFor, roleNames } from '../utils/account';
import { NotificationBell } from './NotificationBell';
import { GlobalSearch } from './GlobalSearch';
import { SiteRail } from './SiteRail';
import '../styles/site-shell.css';
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="ETM — Trang chủ">
      <img className="brand-logo" src="/logo.svg" alt="ETM" width={48} height={48} />
    </Link>
  );
}
export function ThemeButton() {
  const { theme, toggle } = useTheme();
  return (
    <button
      className="icon-button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}
    >
      {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
export function Navbar({
  onMenu,
  publicRail = false,
  menuOpen,
}: {
  onMenu?: () => void;
  publicRail?: boolean;
  menuOpen?: boolean;
}) {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const accountMenu = useRef<HTMLDetailsElement>(null);
  const location = useLocation();
  useEffect(() => {
    if (accountMenu.current) accountMenu.current.open = false;
  }, [location.pathname, location.search]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (accountMenu.current && !accountMenu.current.contains(event.target as Node))
        accountMenu.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && accountMenu.current?.open) {
        accountMenu.current.open = false;
        accountMenu.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  async function logout() {
    setBusy(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <header className="topbar">
      {onMenu ? (
        <>
          <button
            onClick={onMenu}
            className={`icon-button ${publicRail ? 'site-mobile-menu' : 'mobile-menu'}`}
            aria-label="Mở menu"
            aria-expanded={menuOpen}
            aria-controls={publicRail ? 'site-navigation' : undefined}
          >
            <Menu size={22} />
          </button>
          {publicRail && (
            <span className="site-mobile-brand">
              <Brand />
            </span>
          )}
        </>
      ) : (
        <Brand />
      )}
      <div className="topbar-actions">
        <GlobalSearch />
        <ThemeButton />
        {user && <NotificationBell />}
        {user ? (
          <details ref={accountMenu} className="user-menu">
            <summary>
              <Avatar name={user.fullName} url={user.avatarUrl} />
              <span className="user-name">
                {user.fullName}
                <small>{roleNames[user.systemRole]}</small>
              </span>
            </summary>
            <div className="dropdown">
              {user.systemRole !== 'Customer' && <Link to={homeFor(user)}>Bảng điều khiển</Link>}
              <Link to="/profile">Hồ sơ cá nhân</Link>
              <Link to="/settings">Cài đặt tài khoản</Link>
              <Button variant="ghost" onClick={logout} busy={busy}>
                <LogOut size={16} /> Đăng xuất
              </Button>
            </div>
          </details>
        ) : (
          <>
            <Link className="text-link" to="/login">
              Đăng nhập
            </Link>
            <Link className="button primary" to="/register">
              Tạo tài khoản <ArrowUpRight size={16} />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      © {new Date().getFullYear()} ETM <span>Esports Tournament Management</span>
    </footer>
  );
}
export function PageLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  return (
    <div className={`public-layout site-shell ${open ? 'rail-expanded' : ''}`}>
      <SiteRail open={open} onToggle={() => setOpen((value) => !value)} onClose={() => setOpen(false)} />
      <div className="site-shell-body">
        <Navbar publicRail menuOpen={open} onMenu={() => setOpen((value) => !value)} />
        <main className="site-main">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
export function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homeFor(user) : '/login'} replace />;
}
export function DashboardLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (user?.systemRole === 'Customer') return <PageLayout />;
  return (
    <div className="workspace">
      {open && <button className="sidebar-backdrop" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Brand />
          <button className="icon-button mobile-menu" onClick={() => setOpen(false)} aria-label="Đóng menu">
            <X size={19} />
          </button>
        </div>
        <nav onClick={() => setOpen(false)}>
          <NavLink to={homeFor(user!)}>
            <LayoutDashboard size={19} /> Tổng quan
          </NavLink>
          {user?.systemRole === 'Administrator' && (
            <>
              {[
                ['/admin/clubs', 'Câu lạc bộ'],
                ['/admin/games', 'Game'],
                ['/admin/notifications', 'Mẫu thông báo'],
                ['/admin/bans', 'Lệnh cấm'],
                ['/admin/content', 'Nội dung'],
                ['/admin/reports', 'Báo cáo trận đấu'],
                ['/admin/audit', 'Audit tỉ số'],
                ['/admin/security', 'Bảo mật'],
              ].map(([path, label]) => (
                <NavLink key={path} to={path}>
                  <ShieldCheck size={19} />
                  {label}
                </NavLink>
              ))}
            </>
          )}
          {user?.systemRole === 'ClubManager' && (
            <>
              {[
                ['/cm/club', 'Hồ sơ CLB'],
                ['/cm/members', 'Thành viên'],
                ['/cm/teams', 'Đội tuyển'],
                ['/cm/applications', 'Hồ sơ đăng ký'],
                ['/cm/rosters', 'Đội hình tham dự'],
                ['/cm/protests', 'Khiếu nại'],
              ].map(([path, label]) => (
                <NavLink to={path} key={path}>
                  <Users size={19} />
                  {label}
                </NavLink>
              ))}
            </>
          )}
          {user?.systemRole === 'TournamentOrganizer' && (
            <NavLink to="/to/tournaments">
              <Trophy size={19} />
              Giải đấu
            </NavLink>
          )}
          {user?.systemRole === 'Administrator' && (
            <NavLink to="/admin/accounts">
              <Users size={19} /> Tài khoản
            </NavLink>
          )}
          <NavLink to="/notifications">
            <UserRound size={19} /> Thông báo
          </NavLink>
          {user?.systemRole === 'TournamentOrganizer' && (
            <NavLink to="/to/protests">
              <ShieldCheck size={19} />
              Khiếu nại
            </NavLink>
          )}
          <NavLink to="/">
            <Trophy size={19} />
            Khám phá ETM
          </NavLink>
          <NavLink to="/profile">
            <UserRound size={19} /> Hồ sơ cá nhân
          </NavLink>
          <NavLink to="/settings">
            <Settings size={19} /> Cài đặt
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck size={20} />
          <div>
            Phiên kết nối an toàn<small>ETM · Workspace</small>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <Navbar onMenu={() => setOpen(!open)} />
        <main className="content">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
export function AuthLayout() {
  return (
    <div className="auth-layout">
      <header className="auth-header">
        <Brand />
        <nav aria-label="Điều hướng tài khoản">
          <Link to="/">Trang chủ</Link>
          <Link to="/tournaments">Giải đấu</Link>
          <Link to="/clubs">Câu lạc bộ</Link>
          <Link to="/standings">Bảng xếp hạng</Link>
        </nav>
        <ThemeButton />
      </header>
      <aside className="auth-aside">
        <div>
          <h1>
            Nền tảng quản lý
            <br />
            Giải đấu <span>Esports</span>
          </h1>
          <p>
            Tổ chức, quản lý và vận hành các giải đấu Esports một cách chuyên nghiệp, hiệu quả và minh bạch.
          </p>
          <div className="auth-showcase">
            <div className="auth-features">
              {[
                [Trophy, 'Quản lý giải đấu'],
                [Users, 'Quản lý đội tuyển'],
                [CalendarDays, 'Lịch thi đấu'],
                [ChartNoAxesColumnIncreasing, 'Bảng xếp hạng'],
              ].map(([Icon, title]) => {
                const FeatureIcon = Icon as typeof Trophy;
                return (
                  <div key={String(title)}>
                    <FeatureIcon size={30} />
                    <span>{String(title)}</span>
                  </div>
                );
              })}
            </div>
            <div className="trophy-scene" aria-hidden="true">
              <svg viewBox="0 0 300 360" fill="none">
                <defs>
                  <linearGradient
                    id="cup-metal"
                    x1="65"
                    y1="50"
                    x2="235"
                    y2="180"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#8dd5ff" />
                    <stop offset=".28" stopColor="#f5fbff" />
                    <stop offset=".55" stopColor="#66aff7" />
                    <stop offset=".8" stopColor="#0752c0" />
                    <stop offset="1" stopColor="#46b5ff" />
                  </linearGradient>
                  <linearGradient
                    id="cup-base"
                    x1="60"
                    y1="275"
                    x2="240"
                    y2="330"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#184d92" />
                    <stop offset=".5" stopColor="#287ce9" />
                    <stop offset="1" stopColor="#092d6b" />
                  </linearGradient>
                </defs>
                <ellipse cx="150" cy="332" rx="135" ry="16" fill="#1476e9" opacity=".12" />
                <path
                  d="M77 73H38C36 133 54 166 108 169M223 73H262C264 133 246 166 192 169"
                  stroke="url(#cup-metal)"
                  strokeWidth="15"
                />
                <path
                  d="M72 49H228L215 126C209 169 186 191 150 195C114 191 91 169 85 126Z"
                  fill="url(#cup-metal)"
                  stroke="#70b8ff"
                  strokeWidth="3"
                />
                <ellipse cx="150" cy="49" rx="78" ry="12" fill="#ecf8ff" stroke="#75bdff" strokeWidth="4" />
                <path
                  d="M150 81L161 105L188 109L168 127L173 154L150 141L127 154L132 127L112 109L139 105Z"
                  fill="#f2faff"
                />
                <path d="M139 192H161L169 247L193 266H107L131 247Z" fill="url(#cup-metal)" />
                <path d="M90 266H210L232 306H68Z" fill="url(#cup-base)" />
                <path d="M65 305H235V326H65Z" fill="#0b3d87" />
                <path d="M71 307H229" stroke="#6acfff" strokeWidth="3" />
                <rect x="123" y="282" width="54" height="12" rx="3" fill="#bceaff" opacity=".8" />
              </svg>
              <Gamepad2 className="scene-controller" size={94} strokeWidth={1.4} />
            </div>
          </div>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-emblem" aria-hidden="true">
            <Gamepad2 size={48} strokeWidth={1.8} />
          </div>
          <Outlet />
        </div>
        <p className="auth-footer">ETM · Được xây dựng cho tinh thần thi đấu.</p>
      </main>
    </div>
  );
}
