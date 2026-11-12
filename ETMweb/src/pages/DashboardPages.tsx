import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Users, Building2, Trophy, UserCheck, ShieldCheck, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminApi } from '../services/api';
import { Alert, Avatar, Badge, PageHeading, QueryError, Spinner, Table } from '../components/ui';
import { formatDate, homeFor, roleNames } from '../utils/account';
export function HomePage() {
  const { user } = useAuth();
  return (
    <div className="landing">
      <p className="eyebrow">ESPORTS TOURNAMENT MANAGEMENT</p>
      <h1>
        Built for competition.
        <br />
        <span>Ready for your next win.</span>
      </h1>
      <p className="muted">
        Không gian kết nối người hâm mộ, câu lạc bộ và ban tổ chức giải đấu thể thao điện tử.
      </p>
      <Link className="button primary" to={user ? homeFor(user) : '/register'}>
        {user ? 'Vào không gian làm việc' : 'Bắt đầu cùng ETM'}
        <ArrowUpRight size={19} />
      </Link>
      <div className="landing-grid">
        <article>
          <Trophy />
          <h2>Giải đấu</h2>
          <p>Theo dõi hành trình thi đấu và những trận đấu quyết định.</p>
        </article>
        <article>
          <Building2 />
          <h2>Câu lạc bộ</h2>
          <p>Kết nối hoạt động đội tuyển trong một hệ thống thống nhất.</p>
        </article>
        <article>
          <Users />
          <h2>Cộng đồng</h2>
          <p>Một tài khoản để đồng hành cùng thế giới esports.</p>
        </article>
      </div>
    </div>
  );
}
export function PersonalDashboard() {
  const { user } = useAuth();
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORKSPACE"
        title={`Xin chào, ${user!.fullName}`}
        description="Chào mừng bạn quay lại không gian làm việc ETM."
      />
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">READY TO GET STARTED</span>
          <h2>Hoàn thiện hồ sơ của bạn.</h2>
          <p>Giữ thông tin tài khoản luôn chính xác để sẵn sàng tham gia các hoạt động.</p>
          <Link className="button primary" to="/profile">
            Xem hồ sơ <ArrowUpRight size={17} />
          </Link>
        </div>
        <ShieldCheck size={100} strokeWidth={1} />
      </section>
      <div className="dashboard-grid">
        <Link className="panel quick-link" to="/profile">
          <UserCheck />
          <h2>Thông tin cá nhân</h2>
          <p>{user!.email}</p>
          <span>
            {roleNames[user!.systemRole]} <ArrowUpRight size={16} />
          </span>
        </Link>
        <Link className="panel quick-link" to="/settings">
          <Settings />
          <h2>Cài đặt tài khoản</h2>
          <p>Quyền riêng tư, thông báo và mật khẩu.</p>
          <span>
            Quản lý cài đặt <ArrowUpRight size={16} />
          </span>
        </Link>
      </div>
    </>
  );
}
export function AdminDashboard() {
  const query = useQuery({ queryKey: ['admin', 'overview'], queryFn: adminApi.overview });
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Tổng quan hệ thống"
        description="Theo dõi tài khoản và các hoạt động trên ETM."
        action={
          <Link className="button secondary" to="/admin/accounts">
            Quản lý tài khoản <ArrowUpRight size={16} />
          </Link>
        }
      />
      {query.isPending ? (
        <Spinner />
      ) : query.isError ? (
        <QueryError
          message={query.error.message}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <>
          <div className="stats-grid">
            {[
              { label: 'Tổng tài khoản', value: query.data.totalAccounts, Icon: Users },
              { label: 'Câu lạc bộ', value: query.data.totalClubs, Icon: Building2 },
              { label: 'Giải đấu', value: query.data.totalTournaments, Icon: Trophy },
              { label: 'Chờ kích hoạt', value: query.data.pendingAccounts, Icon: UserCheck },
            ].map(({ label, value, Icon }) => (
              <article className="stat panel" key={label}>
                <div>
                  <span>{label}</span>
                  <Icon size={19} />
                </div>
                <strong>{value.toLocaleString('vi-VN')}</strong>
                <small>Dữ liệu hiện tại trong hệ thống</small>
              </article>
            ))}
          </div>
          {query.data.pendingAccounts > 0 && (
            <Alert kind="info">
              Có {query.data.pendingAccounts} tài khoản đang chờ kích hoạt.{' '}
              <Link to="/admin/accounts?status=Pending">Xem danh sách →</Link>
            </Alert>
          )}
          <section className="panel table-panel">
            <div className="section-heading">
              <div>
                <h2>Tài khoản gần đây</h2>
                <p className="muted small">Các tài khoản mới được tạo trong hệ thống</p>
              </div>
              <Link to="/admin/accounts">Xem tất cả →</Link>
            </div>
            <Table>
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {query.data.recentAccounts.map((account) => (
                  <tr key={account._id}>
                    <td>
                      <Link className="account-cell" to={`/admin/accounts/${account._id}`}>
                        <Avatar name={account.fullName} url={account.avatarUrl} />
                        <span>
                          {account.fullName}
                          <small>{account.email}</small>
                        </span>
                      </Link>
                    </td>
                    <td>{roleNames[account.systemRole]}</td>
                    <td>
                      <Badge status={account.status} />
                    </td>
                    <td>{formatDate(account.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!query.data.recentAccounts.length && <p className="empty muted">Chưa có tài khoản.</p>}
          </section>
        </>
      )}
    </>
  );
}
