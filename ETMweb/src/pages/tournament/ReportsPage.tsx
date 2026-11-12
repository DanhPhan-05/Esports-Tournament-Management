import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { managementApi } from '../../services/management';
import { Button, PageHeading, QueryError, Spinner, Table } from '../../components/ui';
import { Empty, Status } from '../../components/management';
import { downloadCsv } from '../../utils/competition';
import { formatDate } from '../../utils/account';
import type { Result } from '../../types/competition';
interface StandingRow {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  scoreFor: number;
  scoreAgainst: number;
}
export function ReportsPage() {
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['to', id, 'complete-report'],
    queryFn: async () => ({
      report: await managementApi.report(id),
      tournament: await managementApi.tournament(id),
    }),
  });
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
  const { report, tournament } = query.data;
  const results = report.results as Result[];
  const standings = report.standings as StandingRow[];
  const teamName = (team: string) =>
    report.participants.find((p) => p.teamId?._id === team)?.teamId?.name || team;
  function csv() {
    const rows: unknown[][] = [
      ['Tournament', tournament.name],
      ['Participants', report.participants.length],
      [],
      ['Participants'],
      ['Team', 'Status'],
      ...report.participants.map((a) => [a.teamId?.name, a.status]),
      [],
      ['Schedule and Results'],
      ['Round', 'Match', 'Team A', 'Team B', 'Scheduled', 'Status', 'Score A', 'Score B'],
      ...report.schedule.map((m) => {
        const result = results.find((r) => (r as Result & { matchId: string }).matchId === m._id);
        return [
          m.round,
          m.position,
          m.teamAId?.name,
          m.teamBId?.name,
          m.scheduledAt,
          m.status,
          result?.teamAScore,
          result?.teamBScore,
        ];
      }),
      [],
      ['Standings'],
      ['Team', 'Played', 'Wins', 'Losses', 'Points', 'Score For', 'Score Against'],
      ...standings.map((s) => [
        teamName(s.teamId),
        s.played,
        s.wins,
        s.losses,
        s.points,
        s.scoreFor,
        s.scoreAgainst,
      ]),
    ];
    downloadCsv(`${tournament.slug}-report.csv`, rows);
  }
  return (
    <div className="tournament-report">
      <div className="no-print">
        <Link to={`/to/tournaments/${id}`}>← Chi tiết giải</Link>
      </div>
      <PageHeading
        title={`Báo cáo · ${tournament.name}`}
        description={`Ngày xuất: ${formatDate(new Date().toISOString(), true)}`}
        action={
          <div className="row-actions no-print">
            <Button variant="secondary" onClick={csv}>
              Xuất CSV
            </Button>
            <Button onClick={() => window.print()}>Xuất PDF</Button>
          </div>
        }
      />
      <p className="muted small no-print">
        Xuất PDF mở hộp thoại in của trình duyệt; chọn “Save as PDF / Lưu dưới dạng PDF”.
      </p>
      <div className="stats-grid spaced">
        {[
          ['Team tham dự', report.participants.length],
          ['Tổng trận', report.matches],
          ['Kết quả chính thức', results.length],
        ].map(([label, value]) => (
          <article className="panel stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="panel spaced">
        <h2>Đội tham dự</h2>
        <Table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {report.participants.map((a) => (
              <tr key={a._id}>
                <td>{a.teamId?.name || '—'}</td>
                <td>
                  <Status value={a.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!report.participants.length && <Empty />}
      </section>
      <section className="panel spaced">
        <h2>Lịch và kết quả</h2>
        <Table>
          <thead>
            <tr>
              <th>Vòng</th>
              <th>Trận</th>
              <th>Thời gian</th>
              <th>Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {report.schedule.map((m) => {
              const result = results.find((r) => (r as Result & { matchId: string }).matchId === m._id);
              return (
                <tr key={m._id}>
                  <td>{m.round}</td>
                  <td>
                    {m.teamAId?.name || 'TBD'} — {m.teamBId?.name || 'TBD'}
                  </td>
                  <td>{formatDate(m.scheduledAt, true)}</td>
                  <td>
                    {result ? `${result.teamAScore} : ${result.teamBScore}` : 'Chưa có kết quả chính thức'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </section>
      <section className="panel spaced">
        <h2>Bảng xếp hạng</h2>
        <Table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Trận</th>
              <th>Thắng</th>
              <th>Thua</th>
              <th>Điểm</th>
              <th>Hiệu số</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => (
              <tr key={s.teamId}>
                <td>{teamName(s.teamId)}</td>
                <td>{s.played}</td>
                <td>{s.wins}</td>
                <td>{s.losses}</td>
                <td>{s.points}</td>
                <td>{s.scoreFor - s.scoreAgainst}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!standings.length && <Empty />}
      </section>
    </div>
  );
}
