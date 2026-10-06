import { useState } from 'react';
import { formatPrize } from '../../utils/tournament';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { managementApi, getData, save } from '../../services/management';
import { Button, PageHeading, QueryError, Spinner, Table } from '../../components/ui';
import { ConfirmAction, Empty, Status } from '../../components/management';
import { formatDate } from '../../utils/account';
import { pendingApplication } from '../../utils/management';
import { gameName, type Match, type Tournament } from '../../types/management';
export function OrganizerDashboard() {
  const query = useQuery({
    queryKey: ['to', 'overview'],
    queryFn: async () => {
      const tournaments = await managementApi.tournaments();
      const details = await Promise.all(
        tournaments.map(async (t) => ({
          report: await managementApi.report(t._id),
          applications: await managementApi.tournamentApplications(t._id),
        })),
      );
      return {
        tournaments,
        pending: details.reduce(
          (n, d) => n + d.applications.filter((a) => pendingApplication(a.status)).length,
          0,
        ),
        today: details
          .flatMap((d) => d.report.schedule)
          .filter(
            (m) => m.scheduledAt && new Date(m.scheduledAt).toDateString() === new Date().toDateString(),
          ).length,
      };
    },
  });
  return (
    <>
      <PageHeading
        eyebrow="ORGANIZER WORKSPACE"
        title="Tổng quan giải đấu"
        action={
          <Link className="button primary" to="/to/tournaments/new">
            Tạo giải đấu
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
              ['Giải đấu', query.data.tournaments.length],
              ['Hồ sơ chờ xử lý', query.data.pending],
              ['Trận hôm nay', query.data.today],
            ].map(([label, value]) => (
              <article className="panel stat" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <TournamentTable tournaments={query.data.tournaments.slice(0, 5)} />
        </>
      )}
    </>
  );
}
function TournamentTable({ tournaments }: { tournaments: Tournament[] }) {
  return (
    <section className="panel table-panel">
      <Table>
        <thead>
          <tr>
            <th>Giải đấu</th>
            <th>Game</th>
            <th>Trạng thái</th>
            <th>Khởi tranh</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tournaments.map((t) => (
            <tr key={t._id}>
              <td>{t.name}</td>
              <td>{gameName(t.gameId)}</td>
              <td>
                <Status value={t.status} />
              </td>
              <td>{formatDate(t.startAt, true)}</td>
              <td>
                <Link to={`/to/tournaments/${t._id}`}>Chi tiết →</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {!tournaments.length && <Empty>Chưa có giải đấu phù hợp.</Empty>}
    </section>
  );
}
export function TournamentList() {
  const query = useQuery({ queryKey: ['to', 'tournaments'], queryFn: managementApi.tournaments });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  return (
    <>
      <PageHeading
        title="Giải đấu của tôi"
        action={
          <Link className="button primary" to="/to/tournaments/new">
            Tạo giải đấu
          </Link>
        }
      />
      <div className="filters">
        <input
          aria-label="Tìm giải đấu"
          placeholder="Tìm theo tên…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Trạng thái giải đấu" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {[
            'Draft',
            'RegistrationOpen',
            'RegistrationClosed',
            'Ongoing',
            'Completed',
            'Postponed',
            'Cancelled',
          ].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
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
        <TournamentTable
          tournaments={query.data.filter(
            (t) => t.name.toLowerCase().includes(search.toLowerCase()) && (!status || t.status === status),
          )}
        />
      )}
    </>
  );
}
export function TournamentDetail() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'info';
  const query = useQuery({ queryKey: ['to', 'tournament', id], queryFn: () => managementApi.tournament(id) });
  const [action, setAction] = useState('');
  if (query.isPending) return <Spinner />;
  if (query.isError)
    return (
      <QueryError
        message={query.error.message}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const t = query.data;
  const transitions: { key: string; label: string; from: string[] }[] = [
    { key: 'publish', label: 'Công bố', from: ['Draft'] },
    { key: 'close', label: 'Đóng đăng ký', from: ['RegistrationOpen'] },
    { key: 'postpone', label: 'Tạm hoãn', from: ['Ongoing'] },
    {
      key: 'cancel',
      label: 'Hủy giải',
      from: ['Draft', 'RegistrationOpen', 'RegistrationClosed', 'Ongoing', 'Postponed'],
    },
  ];
  return (
    <>
      <Link to="/to/tournaments">← Danh sách giải đấu</Link>
      <PageHeading
        title={t.name}
        description={`${gameName(t.gameId)} · ${t.tournamentType}`}
        action={
          <div className="row-actions">
            {['Draft', 'RegistrationOpen'].includes(t.status) && (
              <Link className="button secondary" to={`/to/tournaments/${id}/edit`}>
                Chỉnh sửa
              </Link>
            )}
            {transitions
              .filter((a) => a.from.includes(t.status))
              .map((a) => (
                <Button
                  key={a.key}
                  variant={a.key === 'cancel' ? 'danger' : 'secondary'}
                  onClick={() => setAction(a.key)}
                >
                  {a.label}
                </Button>
              ))}
          </div>
        }
      />
      <Status value={t.status} />
      <nav className="competition-nav" aria-label="Quản lý nghiệp vụ giải">
        {[
          ['applications', 'Duyệt hồ sơ'],
          ['rosters', 'Duyệt đội hình'],
          ['brackets', 'Quản lý nhánh đấu'],
          ['matches', 'Quản lý trận đấu'],
          ['reports', 'Xuất báo cáo'],
        ].map(([path, label]) => (
          <Link key={path} className="button secondary" to={`/to/tournaments/${id}/${path}`}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="tabs spaced" role="tablist" aria-label="Chi tiết giải đấu">
        {[
          ['info', 'Thông tin'],
          ['applications', 'Hồ sơ đăng ký'],
          ['brackets', 'Nhánh đấu'],
          ['matches', 'Trận đấu'],
          ['reports', 'Báo cáo'],
        ].map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setParams({ tab: key })}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'info' ? (
        <section className="panel">
          <h2>Thông tin giải đấu</h2>
          <p className="prose">{t.description || 'Chưa có mô tả.'}</p>
          <dl className="detail-facts">
            {[
              ['Địa điểm', t.venue || '—'],
              ['Khu vực', t.region || '—'],
              ['Số đội tối đa', t.maxTeams],
              ['Số thành viên / roster', `${t.minRosterSize}–${t.maxRosterSize}`],
              ['Mở đăng ký', formatDate(t.registrationOpenAt, true)],
              ['Đóng đăng ký', formatDate(t.registrationCloseAt, true)],
              ['Khóa roster', formatDate(t.rosterLockAt, true)],
              ['Khởi tranh', formatDate(t.startAt, true)],
              ['Kết thúc', formatDate(t.endAt, true)],
              ['Giải thưởng', formatPrize(t)],
            ].map(([label, value]) => (
              <div className="fact-pair" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <h2 className="spaced">Điều lệ</h2>
          <p className="prose">{t.rules || 'Chưa cập nhật.'}</p>
          {(t.cancelReason || t.postponeReason) && (
            <p className="prose">Lý do: {t.cancelReason || t.postponeReason}</p>
          )}
        </section>
      ) : (
        <TournamentTab id={id} tab={tab} />
      )}
      {action && (
        <ConfirmAction
          title={`${transitions.find((a) => a.key === action)?.label} giải đấu?`}
          description="Thao tác sẽ cập nhật trạng thái giải đấu theo quy tắc hệ thống."
          reason={['cancel', 'postpone'].includes(action)}
          onClose={() => setAction('')}
          action={(reason) => save(`/tournaments/${id}/${action}`, { reason })}
        />
      )}
    </>
  );
}
function TournamentTab({ id, tab }: { id: string; tab: string }) {
  const report = useQuery({
    queryKey: ['to', id, 'report'],
    queryFn: () => managementApi.report(id),
    enabled: tab !== 'applications',
  });
  const apps = useQuery({
    queryKey: ['to', id, 'applications'],
    queryFn: () => managementApi.tournamentApplications(id),
    enabled: tab === 'applications',
  });
  const bracket = useQuery({
    queryKey: ['to', id, 'bracket'],
    queryFn: () =>
      getData<{ bracket: { status: string }; matches: Match[] }>(`/tournaments/${id}/brackets/manage`),
    enabled: tab === 'brackets',
    retry: false,
  });
  if (tab === 'applications')
    return apps.isPending ? (
      <Spinner />
    ) : apps.isError ? (
      <QueryError
        message={apps.error.message}
        retry={() => {
          void apps.refetch();
        }}
      />
    ) : (
      <section className="panel table-panel">
        <Table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Trạng thái</th>
              <th>Ngày nộp</th>
            </tr>
          </thead>
          <tbody>
            {apps.data.map((a) => (
              <tr key={a._id}>
                <td>{a.teamId?.name || 'Team không còn tồn tại'}</td>
                <td>
                  <Status value={a.status} />
                </td>
                <td>{formatDate(a.submittedAt, true)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!apps.data.length && <Empty>Chưa có hồ sơ đăng ký.</Empty>}
      </section>
    );
  if (report.isPending) return <Spinner />;
  if (report.isError)
    return (
      <QueryError
        message={report.error.message}
        retry={() => {
          void report.refetch();
        }}
      />
    );
  if (tab === 'brackets') {
    if (bracket.isPending) return <Spinner />;
    if (bracket.isError)
      return (
        <section className="panel">
          <Empty>
            {'status' in bracket.error && bracket.error.status === 404
              ? 'Giải đấu chưa có nhánh đấu.'
              : bracket.error.message}
          </Empty>
        </section>
      );
    return (
      <section className="panel">
        <h2>Nhánh đấu · {bracket.data.bracket.status}</h2>
        <div className="bracket-readonly">
          {[...new Set(bracket.data.matches.map((m) => m.round))].map((round) => (
            <div key={round}>
              <h3>Vòng {round}</h3>
              {bracket.data.matches
                .filter((m) => m.round === round)
                .map((m) => {
                  const match = report.data.schedule.find((s) => s._id === m._id);
                  return (
                    <article className="panel" key={m._id}>
                      {match?.teamAId?.name || 'TBD'}
                      <hr />
                      {match?.teamBId?.name || 'TBD'}
                    </article>
                  );
                })}
            </div>
          ))}
        </div>
      </section>
    );
  }
  if (tab === 'reports')
    return (
      <section className="panel">
        <h2>Báo cáo tổng quan</h2>
        <dl className="detail-facts">
          <dt>Hồ sơ đăng ký</dt>
          <dd>{report.data.applications}</dd>
          <dt>Tổng số trận</dt>
          <dd>{report.data.matches}</dd>
          <dt>Kết quả đã ghi nhận</dt>
          <dd>{report.data.completedMatches}</dd>
          <dt>Team đã duyệt</dt>
          <dd>{report.data.participants.length}</dd>
          <dt>Kết quả chính thức</dt>
          <dd>{report.data.results.length}</dd>
        </dl>
      </section>
    );
  return (
    <section className="panel table-panel">
      <Table>
        <thead>
          <tr>
            <th>Vòng</th>
            <th>Trận đấu</th>
            <th>Thời gian</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {report.data.schedule.map((m) => (
            <tr key={m._id}>
              <td>{m.round}</td>
              <td>
                {m.teamAId?.name || 'TBD'} — {m.teamBId?.name || 'TBD'}
              </td>
              <td>{formatDate(m.scheduledAt, true)}</td>
              <td>
                <Status value={m.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {!report.data.schedule.length && <Empty>Chưa có lịch thi đấu.</Empty>}
    </section>
  );
}
