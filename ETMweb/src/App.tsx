import { Component, lazy, Suspense, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthLayout, DashboardLayout, DashboardRedirect, PageLayout } from './components/layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage, RegisterPage, ForgotPasswordPage, TokenPage, OAuthCallbackPage } from './pages/AuthPages';
import { HomePage, AdminDashboard } from './pages/DashboardPages';
import { ProfilePage, SettingsPage } from './pages/ProfilePages';
import { AccountsPage } from './pages/admin/AccountsPage';
import { AccountDetailPage } from './pages/admin/AccountDetailPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ClubScope } from './pages/club/ClubScope';
import { ClubDashboard, ClubProfile, EditClub } from './pages/club/ClubPages';
import { MembersPage } from './pages/club/MembersPage';
import { TeamsPage } from './pages/club/TeamsPage';
import { OrganizerDashboard, TournamentList, TournamentDetail } from './pages/tournament/TournamentPages';
import { TournamentFormPage } from './pages/tournament/TournamentForm';
import { Spinner } from './components/ui';
import { useAuth } from './contexts/AuthContext';
import { homeFor } from './utils/account';
const PublicHome = lazy(() => import('./pages/public/PublicPages').then((m) => ({ default: m.PublicHome })));
const PublicTournaments = lazy(() =>
  import('./pages/public/PublicPages').then((m) => ({ default: m.PublicTournaments })),
);
const PublicTournamentDetail = lazy(() =>
  import('./pages/public/PublicPages').then((m) => ({ default: m.PublicTournamentDetail })),
);
const PublicClubs = lazy(() =>
  import('./pages/public/PublicPages').then((m) => ({ default: m.PublicClubs })),
);
const PublicClubDetail = lazy(() =>
  import('./pages/public/PublicPages').then((m) => ({ default: m.PublicClubDetail })),
);
const PublicStandings = lazy(() =>
  import('./pages/public/PublicPages').then((m) => ({ default: m.PublicStandings })),
);
const PublicNews = lazy(() => import('./pages/public/PublicPages').then((m) => ({ default: m.PublicNews })));
const PublicArticle = lazy(() =>
  import('./pages/public/PublicPages').then((m) => ({ default: m.PublicArticle })),
);
const PublicGames = lazy(() =>
  import('./pages/public/PublicPages').then((m) => ({ default: m.PublicGames })),
);
const PublicMatchDetail = lazy(() =>
  import('./pages/public/PublicPages').then((m) => ({ default: m.PublicMatchDetail })),
);
const SearchPage = lazy(() => import('./pages/public/PublicPages').then((m) => ({ default: m.SearchPage })));
const PickemPage = lazy(() =>
  import('./pages/pickem/PickemExperience').then((m) => ({ default: m.PickemPage })),
);
const PredictionHistory = lazy(() =>
  import('./pages/pickem/PickemPages').then((m) => ({ default: m.PredictionHistory })),
);
const PickemLeaderboard = lazy(() =>
  import('./pages/pickem/PickemPages').then((m) => ({ default: m.PickemLeaderboard })),
);
const ProtestsPage = lazy(() =>
  import('./pages/protests/ProtestPages').then((m) => ({ default: m.ProtestsPage })),
);
const CreateProtestPage = lazy(() =>
  import('./pages/protests/ProtestPages').then((m) => ({ default: m.CreateProtestPage })),
);
const ProtestDetailPage = lazy(() =>
  import('./pages/protests/ProtestPages').then((m) => ({ default: m.ProtestDetailPage })),
);
const ContentPage = lazy(() => import('./pages/admin/ContentPage').then((m) => ({ default: m.ContentPage })));
const ViolationReportsPage = lazy(() =>
  import('./pages/admin/ViolationReportsPage').then((m) => ({ default: m.ViolationReportsPage })),
);
const OwnReportPage = lazy(() =>
  import('./pages/admin/ViolationReportsPage').then((m) => ({ default: m.OwnReportPage })),
);
const AuditPage = lazy(() => import('./pages/admin/AuditPage').then((m) => ({ default: m.AuditPage })));
const SecurityPage = lazy(() =>
  import('./pages/admin/SecurityPage').then((m) => ({ default: m.SecurityPage })),
);
function BusinessRedirect({ kind }: { kind: 'protests' | 'applications' }) {
  const { id } = useParams();
  const { user } = useAuth();
  return <Navigate replace to={`/${user?.systemRole === 'ClubManager' ? 'cm' : 'to'}/${kind}/${id}`} />;
}
function ForbiddenPage() {
  const { user } = useAuth();
  return (
    <div className="empty">
      <p className="eyebrow">403 · ACCESS DENIED</p>
      <h1>Bạn không có quyền truy cập</h1>
      <p className="muted">Tính năng này dành cho vai trò được cấp quyền.</p>
      <Link className="button secondary" to={user ? homeFor(user) : '/login'}>
        {user && user.systemRole !== 'Customer' ? 'Về bảng điều khiển' : 'Về trang chủ'}
      </Link>
    </div>
  );
}
const ApplicationsPage = lazy(() =>
  import('./pages/club/ApplicationsPage').then((m) => ({ default: m.ApplicationsPage })),
);
const ApplicationFormPage = lazy(() =>
  import('./pages/club/ApplicationsPage').then((m) => ({ default: m.ApplicationFormPage })),
);
const RostersPage = lazy(() => import('./pages/club/RostersPage').then((m) => ({ default: m.RostersPage })));
const ApplicationDetailPage = lazy(() =>
  import('./pages/competition/ApplicationDetail').then((m) => ({ default: m.ApplicationDetailPage })),
);
const RosterDetailPage = lazy(() =>
  import('./pages/competition/RosterDetail').then((m) => ({ default: m.RosterDetailPage })),
);
const ApplicationReviewPage = lazy(() =>
  import('./pages/tournament/ApplicationReviewPage').then((m) => ({ default: m.ApplicationReviewPage })),
);
const RosterReviewPage = lazy(() =>
  import('./pages/tournament/RosterReviewPage').then((m) => ({ default: m.RosterReviewPage })),
);
const BracketPage = lazy(() =>
  import('./pages/tournament/BracketPage').then((m) => ({ default: m.BracketPage })),
);
const MatchesPage = lazy(() =>
  import('./pages/tournament/MatchesPage').then((m) => ({ default: m.MatchesPage })),
);
const MatchDetailPage = lazy(() =>
  import('./pages/tournament/MatchDetailPage').then((m) => ({ default: m.MatchDetailPage })),
);
const ReportsPage = lazy(() =>
  import('./pages/tournament/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const AdminClubsPage = lazy(() =>
  import('./pages/admin/ClubsPage').then((m) => ({ default: m.AdminClubsPage })),
);
const AdminGamesPage = lazy(() =>
  import('./pages/admin/GamesPage').then((m) => ({ default: m.AdminGamesPage })),
);
const TemplatesPage = lazy(() =>
  import('./pages/admin/TemplatesPage').then((m) => ({ default: m.TemplatesPage })),
);
const BansPage = lazy(() => import('./pages/admin/BansPage').then((m) => ({ default: m.BansPage })));
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="empty">
        <h1>Không thể hiển thị trang</h1>
        <p>Vui lòng tải lại để thử lại.</p>
        <button className="button primary" onClick={() => window.location.reload()}>
          Tải lại trang
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <>
      <ScrollReset />
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route element={<PageLayout />}>
            <Route index element={<PublicHome />} />
            <Route path="tournaments" element={<PublicTournaments />} />
            <Route path="tournaments/:id" element={<PublicTournamentDetail />} />
            <Route path="clubs" element={<PublicClubs />} />
            <Route path="clubs/:id" element={<PublicClubDetail />} />
            <Route path="standings" element={<PublicStandings />} />
            <Route path="news" element={<PublicNews />} />
            <Route path="news/:slug" element={<PublicArticle />} />
            <Route path="games" element={<PublicGames />} />
            <Route path="matches/:id" element={<PublicMatchDetail />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="forbidden" element={<ForbiddenPage />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>404 · Không tìm thấy trang</h1>
                  <Link to="/">Về trang chủ</Link>
                </div>
              }
            />
          </Route>
          <Route element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password/:token?" element={<TokenPage key="reset" mode="reset" />} />
            <Route path="activate/:key?" element={<TokenPage key="activate" mode="activate" />} />
            <Route path="verify-email/:token?" element={<TokenPage key="verify" mode="verify" />} />
            <Route path="oauth/callback" element={<OAuthCallbackPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="dashboard" element={<DashboardRedirect />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="protests/:id" element={<BusinessRedirect kind="protests" />} />
              <Route path="applications/:id" element={<BusinessRedirect kind="applications" />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute role="ClubManager" />}>
            <Route element={<DashboardLayout />}>
              <Route path="reports/:id" element={<OwnReportPage />} />
              <Route path="cm/protests" element={<ProtestsPage />} />
              <Route path="cm/protests/new" element={<CreateProtestPage />} />
              <Route path="cm/protests/:id" element={<ProtestDetailPage />} />
            </Route>
            <Route element={<DashboardLayout />}>
              <Route element={<ClubScope />}>
                <Route path="cm/dashboard" element={<ClubDashboard />} />
                <Route path="cm/club" element={<ClubProfile />} />
                <Route path="cm/club/edit" element={<EditClub />} />
                <Route path="cm/members" element={<MembersPage />} />
                <Route path="cm/teams" element={<TeamsPage />} />
                <Route path="cm/applications" element={<ApplicationsPage />} />
                <Route path="cm/applications/new" element={<ApplicationFormPage />} />
                <Route path="cm/applications/:id" element={<ApplicationDetailPage />} />
                <Route path="cm/applications/:id/edit" element={<ApplicationFormPage />} />
                <Route path="cm/rosters" element={<RostersPage />} />
                <Route path="cm/rosters/:id/edit" element={<RosterDetailPage />} />
              </Route>
            </Route>
          </Route>
          <Route element={<ProtectedRoute role="TournamentOrganizer" />}>
            <Route element={<DashboardLayout />}>
              <Route path="to/dashboard" element={<OrganizerDashboard />} />
              <Route path="to/protests" element={<ProtestsPage organizer />} />
              <Route path="to/protests/:id" element={<ProtestDetailPage organizer />} />
              <Route path="to/tournaments" element={<TournamentList />} />
              <Route path="to/tournaments/new" element={<TournamentFormPage />} />
              <Route path="to/tournaments/:id" element={<TournamentDetail />} />
              <Route path="to/tournaments/:id/edit" element={<TournamentFormPage />} />
              <Route path="to/tournaments/:id/applications" element={<ApplicationReviewPage />} />
              <Route path="to/applications/:appId" element={<ApplicationDetailPage review />} />
              <Route path="to/tournaments/:id/rosters" element={<RosterReviewPage />} />
              <Route path="to/rosters/:rosterId" element={<RosterDetailPage review />} />
              <Route path="to/tournaments/:id/brackets" element={<BracketPage />} />
              <Route path="to/tournaments/:id/matches" element={<MatchesPage />} />
              <Route path="to/matches/:id" element={<MatchDetailPage />} />
              <Route path="to/tournaments/:id/reports" element={<ReportsPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute role="Customer" />}>
            <Route element={<PageLayout />}>
              <Route path="pickem" element={<PickemPage />} />
              <Route path="pickem/history" element={<PredictionHistory />} />
              <Route path="pickem/leaderboard" element={<PickemLeaderboard />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute role="Administrator" />}>
            <Route element={<DashboardLayout />}>
              <Route path="admin/dashboard" element={<AdminDashboard />} />
              <Route path="admin/content" element={<ContentPage />} />
              <Route path="admin/reports" element={<ViolationReportsPage />} />
              <Route path="admin/audit" element={<AuditPage />} />
              <Route path="admin/security" element={<SecurityPage />} />
              <Route path="admin/accounts" element={<AccountsPage />} />
              <Route path="admin/accounts/:id" element={<AccountDetailPage />} />
              <Route path="admin/clubs" element={<AdminClubsPage />} />
              <Route path="admin/games" element={<AdminGamesPage />} />
              <Route path="admin/notifications" element={<TemplatesPage />} />
              <Route path="admin/bans" element={<BansPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
