import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, UsersRound } from 'lucide-react';
import { managementApi } from '../../services/management';
import { competitionApi } from '../../services/competition';
import { Alert, PageHeading, QueryError, Spinner, Table } from '../../components/ui';
import { Empty, Status } from '../../components/management';
import { refId } from '../../types/management';

const reviewableApplications = ['Submitted', 'UnderReview', 'NeedMoreInfo'];

export function ApplicationReviewPage() {
  return <TournamentReviewWorkspace initialTab="applications" />;
}

export function RosterReviewPage() {
  return <TournamentReviewWorkspace initialTab="rosters" />;
}

function TournamentReviewWorkspace({ initialTab }: { initialTab: 'applications' | 'rosters' }) {
  const { id = '' } = useParams();
  const [tab, setTab] = useState(initialTab);
  const [applicationStatus, setApplicationStatus] = useState('');
  const [rosterStatus, setRosterStatus] = useState('');
  const applications = useQuery({
    queryKey: ['to', id, 'applications'],
    queryFn: () => managementApi.tournamentApplications(id),
  });
  const rosters = useQuery({
    queryKey: ['to', id, 'rosters'],
    queryFn: () => competitionApi.rosters({ tournamentId: id }),
  });

  if (applications.isPending || rosters.isPending) return <Spinner />;
  if (applications.isError || rosters.isError) {
    const message = applications.isError ? applications.error.message : rosters.error.message;
    return (
      <QueryError
        message={message}
        retry={() => {
          void applications.refetch();
          void rosters.refetch();
        }}
      />
    );
  }

  const appData = applications.data;
  const rosterData = rosters.data.map((roster) => ({
    ...roster,
    teamName:
      appData.find((application) => refId(application.teamId) === refId(roster.teamId))?.teamId?.name ||
      'Team không còn tồn tại',
  }));
  const pendingApplications = appData.filter((application) =>
    reviewableApplications.includes(application.status),
  ).length;
  const pendingRosters = rosterData.filter((roster) => roster.status === 'Submitted').length;

  return (
    <>
      <PageHeading
        title="Duyệt hồ sơ tham dự"
        description="Theo dõi hồ sơ đăng ký và roster tại cùng một nơi. Mỗi thủ tục vẫn có trạng thái và quyết định duyệt riêng."
        action={
          <Link className="button secondary" to={`/to/tournaments/${id}`}>
            Chi tiết giải
          </Link>
        }
      />
      <Alert kind="info">
        Duyệt hồ sơ đăng ký và duyệt roster là hai quyết định độc lập. Đội chỉ đủ điều kiện thi đấu khi cả hồ sơ và roster đều được duyệt.
      </Alert>

      <div className="review-summary-grid">
        <button
          type="button"
          className={`review-summary-card ${tab === 'applications' ? 'selected' : ''}`}
          aria-pressed={tab === 'applications'}
          onClick={() => setTab('applications')}
        >
          <ClipboardCheck size={22} />
          <span><strong>Hồ sơ đăng ký</strong><small>{pendingApplications} cần xem xét</small></span>
          <b>{appData.length}</b>
        </button>
        <button
          type="button"
          className={`review-summary-card ${tab === 'rosters' ? 'selected' : ''}`}
          aria-pressed={tab === 'rosters'}
          onClick={() => setTab('rosters')}
        >
          <UsersRound size={22} />
          <span><strong>Đội hình tham dự</strong><small>{pendingRosters} roster chờ duyệt</small></span>
          <b>{rosterData.length}</b>
        </button>
      </div>

      <section className="panel table-panel review-workspace">
        <div className="review-workspace-heading">
          <div>
            <h2>{tab === 'applications' ? 'Hồ sơ đăng ký' : 'Đội hình tham dự'}</h2>
            <p className="muted">
              {tab === 'applications'
                ? 'Duyệt điều kiện đăng ký của Club và Team.'
                : 'Kiểm tra danh sách thành viên và duyệt roster độc lập với hồ sơ.'}
            </p>
          </div>
          {tab === 'applications' ? (
            <select
              aria-label="Lọc trạng thái hồ sơ"
              value={applicationStatus}
              onChange={(event) => setApplicationStatus(event.target.value)}
            >
              <option value="">Tất cả trạng thái hồ sơ</option>
              {['Draft', 'Submitted', 'UnderReview', 'NeedMoreInfo', 'Approved', 'Rejected', 'Withdrawn'].map(
                (status) => <option key={status} value={status}>{status}</option>,
              )}
            </select>
          ) : (
            <select
              aria-label="Lọc trạng thái roster"
              value={rosterStatus}
              onChange={(event) => setRosterStatus(event.target.value)}
            >
              <option value="">Tất cả trạng thái roster</option>
              {['Draft', 'Submitted', 'Approved', 'Rejected', 'Locked'].map(
                (status) => <option key={status} value={status}>{status}</option>,
              )}
            </select>
          )}
        </div>

        {tab === 'applications' ? (
          <Table>
            <thead><tr><th>Team</th><th>Trạng thái hồ sơ</th><th>Ngày nộp</th><th>Thao tác</th></tr></thead>
            <tbody>
              {appData.filter((application) => !applicationStatus || application.status === applicationStatus).map((application) => (
                <tr key={application._id}>
                  <td>{application.teamId?.name || 'Team không còn tồn tại'}</td>
                  <td><Status value={application.status} /></td>
                  <td>{application.submittedAt ? new Date(application.submittedAt).toLocaleString('vi-VN') : '—'}</td>
                  <td><Link to={`/to/applications/${application._id}`}>Mở hồ sơ duyệt →</Link></td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Table>
            <thead><tr><th>Team</th><th>Số thành viên</th><th>Trạng thái roster</th><th>Thao tác</th></tr></thead>
            <tbody>
              {rosterData.filter((roster) => !rosterStatus || roster.status === rosterStatus).map((roster) => (
                <tr key={roster._id}>
                  <td>{roster.teamName}</td>
                  <td>{roster.entries.length}</td>
                  <td><Status value={roster.status} /></td>
                  <td><Link to={`/to/rosters/${roster._id}`}>Mở roster duyệt →</Link></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {tab === 'applications' && !appData.some((application) => !applicationStatus || application.status === applicationStatus) && <Empty>Không có hồ sơ phù hợp.</Empty>}
        {tab === 'rosters' && !rosterData.some((roster) => !rosterStatus || roster.status === rosterStatus) && <Empty>Không có roster phù hợp.</Empty>}
      </section>
    </>
  );
}
