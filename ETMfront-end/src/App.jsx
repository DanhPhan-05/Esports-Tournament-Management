import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout, PageLayout } from './components/layouts.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { HomePage, PlaceholderPage, LoginPage, RegisterPage, DashboardPage } from './pages/index.jsx';

// Route map for later Epics. Pages are placeholders until their owning task is implemented.
const publicPages = [
  ['tournaments', 'Giải đấu'], ['tournaments/:id', 'Chi tiết giải đấu'],
  ['clubs', 'Câu lạc bộ'], ['clubs/:id', 'Chi tiết câu lạc bộ'],
  ['standings', 'Bảng xếp hạng'], ['news', 'Tin tức'], ['games', 'Trò chơi'],
  ['pickem', 'Dự đoán'], ['pickem/history', 'Lịch sử dự đoán'], ['pickem/leaderboard', 'Bảng xếp hạng dự đoán'],
  ['reset-password/:token', 'Đặt lại mật khẩu'], ['activate/:key', 'Kích hoạt tài khoản'],
];
const memberPages = [['settings', 'Cài đặt'], ['notifications', 'Thông báo']];
const clubManagerPages = [
  ['cm/dashboard', 'Quản lý câu lạc bộ'], ['cm/club', 'Hồ sơ câu lạc bộ'], ['cm/club/edit', 'Chỉnh sửa câu lạc bộ'],
  ['cm/members', 'Thành viên'], ['cm/teams', 'Đội tuyển'], ['cm/applications', 'Đơn đăng ký'],
  ['cm/applications/new', 'Đăng ký giải đấu'], ['cm/applications/:id', 'Chi tiết đơn'], ['cm/applications/:id/edit', 'Sửa đơn'],
  ['cm/rosters', 'Đội hình'], ['cm/rosters/:id/edit', 'Sửa đội hình'], ['cm/protests', 'Khiếu nại'],
  ['cm/protests/new', 'Tạo khiếu nại'], ['cm/protests/:id', 'Chi tiết khiếu nại'],
];
const organizerPages = [
  ['to/dashboard', 'Ban tổ chức'], ['to/tournaments', 'Giải đấu của tôi'], ['to/tournaments/new', 'Tạo giải đấu'],
  ['to/tournaments/:id', 'Chi tiết giải đấu'], ['to/tournaments/:id/applications', 'Duyệt đơn đăng ký'],
  ['to/applications/:appId', 'Chi tiết đơn đăng ký'], ['to/tournaments/:id/rosters', 'Duyệt đội hình'],
  ['to/rosters/:rosterId', 'Chi tiết đội hình'], ['to/tournaments/:id/brackets', 'Quản lý bảng đấu'],
  ['to/tournaments/:id/matches', 'Quản lý trận đấu'], ['to/matches/:id', 'Chi tiết trận đấu'],
  ['to/tournaments/:id/reports', 'Báo cáo giải đấu'], ['to/protests', 'Khiếu nại'], ['to/protests/:id', 'Chi tiết khiếu nại'],
];
const adminPages = [
  ['admin/dashboard', 'Quản trị'], ['admin/accounts', 'Tài khoản'], ['admin/accounts/:id', 'Chi tiết tài khoản'],
  ['admin/clubs', 'Câu lạc bộ'], ['admin/games', 'Trò chơi'], ['admin/notifications', 'Mẫu thông báo'],
  ['admin/bans', 'Danh sách cấm'], ['admin/content', 'Nội dung'], ['admin/reports', 'Báo cáo'],
  ['admin/audit', 'Lịch sử kết quả'], ['admin/security', 'Chính sách bảo mật'],
];
const placeholders = (pages) => pages.map(([path, title]) => <Route key={path} path={path} element={<PlaceholderPage title={title} />} />);

export default function App() {
  return <BrowserRouter><Routes>
    <Route element={<PageLayout />}>
      <Route index element={<HomePage />} />
      {placeholders(publicPages)}
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="forgot-password" element={<PlaceholderPage title="Quên mật khẩu" />} />
      <Route path="forbidden" element={<PlaceholderPage title="Bạn không có quyền truy cập" />} />
      <Route path="*" element={<PlaceholderPage title="Không tìm thấy trang" />} />
    </Route>
    <Route element={<ProtectedRoute />}><Route element={<DashboardLayout />}>
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="profile" element={<PlaceholderPage title="Hồ sơ" />} />
      {placeholders(memberPages)}
    </Route></Route>
    <Route element={<ProtectedRoute roles={['ClubManager']} />}><Route element={<DashboardLayout />}>{placeholders(clubManagerPages)}</Route></Route>
    <Route element={<ProtectedRoute roles={['Administrator']} />}><Route element={<DashboardLayout />}>{placeholders(adminPages)}</Route></Route>
    <Route element={<ProtectedRoute roles={['TournamentOrganizer']} />}><Route element={<DashboardLayout />}>{placeholders(organizerPages)}</Route></Route>
    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
    <Route path="/organizer" element={<Navigate to="/to/dashboard" replace />} />
    <Route path="/home" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter>;
}
