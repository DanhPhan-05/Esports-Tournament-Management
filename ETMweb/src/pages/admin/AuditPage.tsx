import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPage } from '../../services/management';
import { adminApi } from '../../services/api';
import {
  Alert,
  Button,
  Modal,
  PageHeading,
  Pagination,
  QueryError,
  Spinner,
  Table,
} from '../../components/ui';
import { Empty } from '../../components/management';
import { formatDate } from '../../utils/account';
import type { ScoreAudit } from '../../types/competition';
type Audit = Omit<ScoreAudit, 'actorId'> & {
  actorId: { _id: string; fullName: string; email: string } | null;
  matchId: {
    _id: string;
    round: number;
    position: number;
    section: string;
    tournamentId: { _id: string; name: string } | null;
    teamAId: { _id: string; name: string; tag: string } | null;
    teamBId: { _id: string; name: string; tag: string } | null;
  } | null;
};
const sections: Record<string, string> = {
  Winners: 'Nhánh thắng',
  Losers: 'Nhánh thua',
  Final: 'Chung kết',
  Reset: 'Chung kết lại',
  RoundRobin: 'Vòng tròn',
};
const matchTitle = (match: Audit['matchId']) =>
  match
    ? `${sections[match.section] || match.section || 'Thi đấu'} · Vòng ${match.round} · Trận ${match.position}`
    : 'Trận đấu không còn tồn tại';
const teamName = (team: NonNullable<Audit['matchId']>['teamAId']) => team?.name || 'Đội không còn tồn tại';
export function AuditPage() {
  const [params] = useSearchParams();
  const [match, setMatch] = useState(params.get('matchId') || '');
  const [actor, setActor] = useState('');
  const [email, setEmail] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Audit | null>(null);
  const accounts = useQuery({
    queryKey: ['admin', 'audit-actors', email],
    queryFn: () => adminApi.accounts({ email, limit: 100 }),
  });
  const invalid = (!!match && !/^[a-f0-9]{24}$/i.test(match)) || (!!from && !!to && from > to);
  const query = useQuery({
    queryKey: ['admin', 'audit', match, actor, from, to, page],
    queryFn: () =>
      getPage<Audit>('/admin/audit-log', {
        matchId: match || undefined,
        actorId: actor || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
        page,
        limit: 10,
      }),
    enabled: !invalid,
  });
  return (
    <>
      <PageHeading
        title="Audit tỉ số trận đấu"
        description="Theo dõi giải đấu, trận đấu, hai đội và lịch sử cập nhật tỉ số."
      />
      <div className="public-filters">
        <input
          aria-label="Mã trận audit"
          placeholder="Mã trận (24 ký tự từ URL trận)"
          value={match}
          onChange={(e) => {
            setMatch(e.target.value);
            setPage(1);
          }}
        />
        <input
          aria-label="Tìm người cập nhật"
          placeholder="Email người cập nhật…"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select
          aria-label="Người cập nhật audit"
          value={actor}
          onChange={(e) => {
            setActor(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả tài khoản</option>
          {accounts.data?.data.map((a) => (
            <option key={a._id} value={a._id}>
              {a.fullName} · {a.email}
            </option>
          ))}
        </select>
        <label>
          Từ thời gian
          <input
            aria-label="Audit từ thời gian"
            type="datetime-local"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Đến thời gian
          <input
            aria-label="Audit đến thời gian"
            type="datetime-local"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      {invalid ? (
        <Alert>Mã trận phải có 24 ký tự hợp lệ và khoảng thời gian phải tăng dần.</Alert>
      ) : query.isPending ? (
        <Spinner />
      ) : query.isError ? (
        <QueryError
          message={query.error.message}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <section className="panel table-panel">
          <Table>
            <thead>
              <tr>
                <th>Giải đấu</th>
                <th>Trận</th>
                <th>Đội A vs Đội B</th>
                <th>Người cập nhật</th>
                <th>Thời gian</th>
                <th>Tỉ số mới</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((a) => (
                <tr key={a._id}>
                  <td>
                    {a.matchId?.tournamentId ? (
                      <Link to={`/tournaments/${a.matchId.tournamentId._id}`}>
                        {a.matchId.tournamentId.name}
                      </Link>
                    ) : (
                      'Giải đấu không còn tồn tại'
                    )}
                  </td>
                  <td>
                    {a.matchId ? (
                      <Link to={`/matches/${a.matchId._id}`}>{matchTitle(a.matchId)}</Link>
                    ) : (
                      matchTitle(null)
                    )}
                  </td>
                  <td>
                    {teamName(a.matchId?.teamAId || null)} vs {teamName(a.matchId?.teamBId || null)}
                  </td>
                  <td>
                    {a.actorId?.fullName || 'Tài khoản không còn tồn tại'}
                    <br />
                    <small className="muted">{a.actorId?.email}</small>
                  </td>
                  <td>{formatDate(a.createdAt, true)}</td>
                  <td>
                    {a.newScore.teamAScore} : {a.newScore.teamBScore}
                  </td>
                  <td>
                    <Button variant="ghost" onClick={() => setDetail(a)}>
                      Xem thay đổi
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!query.data.data.length && <Empty />}
          <Pagination
            label="thay đổi"
            page={page}
            total={query.data.pagination?.total || 0}
            limit={10}
            onChange={setPage}
          />
        </section>
      )}
      {detail && (
        <Modal title="Chi tiết thay đổi tỉ số" onClose={() => setDetail(null)}>
          <h3>{detail.matchId?.tournamentId?.name || 'Giải đấu không còn tồn tại'}</h3>
          <p className="muted">{matchTitle(detail.matchId)}</p>
          <p>
            <strong>
              {teamName(detail.matchId?.teamAId || null)} vs {teamName(detail.matchId?.teamBId || null)}
            </strong>
          </p>
          <p className="small muted">Tỉ số hiển thị theo thứ tự Đội A : Đội B.</p>
          <p>
            {detail.actorId?.fullName} · {formatDate(detail.createdAt, true)}
          </p>
          <div className="audit-diff">
            <div>
              <h3>Trước</h3>
              <strong>
                {detail.previousScore?.teamAScore === undefined
                  ? 'Chưa có kết quả'
                  : `${detail.previousScore.teamAScore} : ${detail.previousScore.teamBScore}`}
              </strong>
            </div>
            <span>→</span>
            <div>
              <h3>Sau</h3>
              <strong>
                {detail.newScore.teamAScore} : {detail.newScore.teamBScore}
              </strong>
            </div>
          </div>
          <p className="prose">{detail.reason || 'Khởi tạo/cập nhật kết quả'}</p>
        </Modal>
      )}
    </>
  );
}
