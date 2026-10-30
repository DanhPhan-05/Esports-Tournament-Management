import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export function Navbar() {
  const { user } = useAuth();
  return <header className="site-header"><div className="container nav-inner"><Link className="brand" to="/"><span className="brand-mark">E</span><span>ETM<span className="brand-dot">.</span></span></Link><nav aria-label="Điều hướng chính"><NavLink to="/tournaments">Giải đấu</NavLink><NavLink to="/clubs">Câu lạc bộ</NavLink><NavLink to="/pickem">Dự đoán</NavLink></nav><div className="nav-actions">{user ? <Link className="button button-small" to="/profile">Tài khoản</Link> : <><Link className="text-link" to="/login">Đăng nhập</Link><Link className="button button-small" to="/register">Tham gia ngay <span aria-hidden="true">↗</span></Link></>}</div></div></header>;
}

export function Footer() { return <footer className="site-footer"><div className="container footer-inner"><span>ETM<span className="brand-dot">.</span> — Esports Tournament Management</span><span>Đấu trường dành cho mọi đội tuyển.</span></div></footer>; }

export function PageLayout() { return <><Navbar /><main id="main-content"><Outlet /></main><Footer /></>; }

export function Sidebar() {
  const { user, logout } = useAuth();
  return <aside className="sidebar"><Link className="brand" to="/"><span className="brand-mark">E</span> ETM<span className="brand-dot">.</span></Link><p className="sidebar-label">Không gian làm việc</p><nav aria-label="Dashboard"><NavLink to="/dashboard">Tổng quan</NavLink><NavLink to="/tournaments">Giải đấu</NavLink><NavLink to="/clubs">Câu lạc bộ</NavLink><NavLink to="/notifications">Thông báo</NavLink>{user?.role === 'ClubManager' && <NavLink to="/cm/dashboard">Quản lý CLB</NavLink>}{user?.role === 'Administrator' && <NavLink to="/admin">Quản trị</NavLink>}{user?.role === 'TournamentOrganizer' && <NavLink to="/organizer">Ban tổ chức</NavLink>}</nav><button className="sidebar-logout" onClick={logout}>Đăng xuất</button></aside>;
}

export function DashboardLayout() { return <div className="dashboard-shell"><Sidebar /><div className="dashboard-content"><header className="dashboard-top"><span>ETM / Workspace</span><Link to="/profile">Hồ sơ ↗</Link></header><main><Outlet /></main></div></div>; }
