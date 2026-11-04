import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { communityApi } from '../../services/community';
import { save } from '../../services/management';
import { api } from '../../services/api';
import {
  Alert,
  Avatar,
  Button,
  PageHeading,
  Pagination,
  QueryError,
  Spinner,
  Table,
} from '../../components/ui';
import { Empty, Status } from '../../components/management';
import { CountdownTimer, useDeadline } from '../../components/CountdownTimer';
import { refId, type Team } from '../../types/management';
import type { PredictionMatch } from '../../types/community';
import { validScore } from '../../utils/competition';
export function PredictionEditor({
  match: m,
  teams,
  initialWinner,
  onSaved,
}: {
  match: PredictionMatch;
  teams: Map<string, Team>;
  initialWinner?: string;
  onSaved: () => void;
}) {
  const client = useQueryClient();
  const aId = refId(m.availableParticipants.teamAId);
  const bId = refId(m.availableParticipants.teamBId);
  const a =
    typeof m.availableParticipants.teamAId === 'object' ? m.availableParticipants.teamAId : teams.get(aId);
  const b =
    typeof m.availableParticipants.teamBId === 'object' ? m.availableParticipants.teamBId : teams.get(bId);
  const pred = m.myPrediction;
  const [winner, setWinner] = useState(initialWinner || refId(pred?.predictedWinnerTeamId));
  const [scoreA, setA] = useState(
    String(
      initialWinner
        ? initialWinner === aId
          ? Math.floor(m.bestOf / 2) + 1
          : 0
        : (pred?.predictedTeam1Score ?? 0),
    ),
  );
  const [scoreB, setB] = useState(
    String(
      initialWinner
        ? initialWinner === bId
          ? Math.floor(m.bestOf / 2) + 1
          : 0
        : (pred?.predictedTeam2Score ?? 0),
    ),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const deadline = m.event?.lockAt || '';
  const { locked: deadlineLocked } = useDeadline(deadline);
  const locked = deadlineLocked || !m.canPredict;
  const ready = !!aId && !!bId;
  return (
    <article className="panel prediction-card" aria-label={`Dự đoán vòng ${m.round} trận ${m.position}`}>
      <div className="section-heading">
        <span>
          Trận {m.position} · BO{m.bestOf}
        </span>
        <CountdownTimer deadline={deadline} />
      </div>
      <div className="prediction-teams">
        {[
          [aId, a, 0],
          [bId, b, 1],
        ].map(([id, team, index]) => (
          <Button
            key={String(index)}
            variant={winner === id ? 'primary' : 'secondary'}
            aria-pressed={winner === id}
            disabled={!ready || locked || busy}
            onClick={() => {
              setWinner(String(id));
              setA(index === 0 ? String(Math.floor(m.bestOf / 2) + 1) : '0');
              setB(index === 1 ? String(Math.floor(m.bestOf / 2) + 1) : '0');
            }}
          >
            {typeof team === 'object' && team ? <Avatar name={team.name} url={team.logoUrl} /> : null}
            {typeof team === 'object' && team ? team.name : 'Chờ dự đoán trận trước'}
          </Button>
        ))}
      </div>
      <Alert>{error}</Alert>
      {locked && (
        <Alert kind="info">
          Trận này không nhận dự đoán. Bạn vẫn có thể xem lựa chọn đã lưu và kết quả chính thức.
        </Alert>
      )}
      {m.result && (
        <p>
          Kết quả chính thức: {m.result.teamAScore} : {m.result.teamBScore}
        </p>
      )}
      {!ready && <p className="muted small">Hoàn thành các dự đoán dẫn vào trận này để chọn đội đi tiếp.</p>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          const x = Number(scoreA),
            y = Number(scoreB);
          if (locked || !ready) return;
          if (!validScore(x, y, m.bestOf, true) || winner !== (x > y ? aId : bId)) {
            setError('Chọn đội thắng và tỉ số phù hợp thể thức BO.');
            return;
          }
          if (
            pred &&
            refId(pred.predictedWinnerTeamId) !== winner &&
            !window.confirm('Đổi đội thắng sẽ xóa các dự đoán ở những trận phụ thuộc. Tiếp tục?')
          )
            return;
          setBusy(true);
          try {
            await save(
              `/predictions${pred ? `/${pred._id}` : ''}`,
              {
                matchId: m._id,
                predictedWinnerTeamId: winner,
                predictedTeam1Score: x,
                predictedTeam2Score: y,
              },
              pred ? 'put' : 'post',
            );
            await client.invalidateQueries({ queryKey: ['pickem'] });
            onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="score-fields">
          <label>
            Tỉ số đội trên
            <input
              aria-label="Tỉ số đội trên"
              type="number"
              min={0}
              step={1}
              required
              disabled={!ready || locked}
              value={scoreA}
              onChange={(e) => setA(e.target.value)}
            />
          </label>
          <label>
            Tỉ số đội dưới
            <input
              aria-label="Tỉ số đội dưới"
              type="number"
              min={0}
              step={1}
              required
              disabled={!ready || locked}
              value={scoreB}
              onChange={(e) => setB(e.target.value)}
            />
          </label>
        </div>
        <div className="form-actions">
          <Button type="submit" busy={busy} disabled={!ready || locked}>
            {pred ? 'Cập nhật dự đoán' : 'Lưu dự đoán'}
          </Button>
          {pred && !locked && (
            <Button
              variant="ghost"
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!window.confirm('Xóa dự đoán này và các trận phụ thuộc?')) return;
                setBusy(true);
                try {
                  await api.delete(`/predictions/${pred._id}`);
                  await client.invalidateQueries({ queryKey: ['pickem'] });
                  onSaved();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Xóa
            </Button>
          )}
        </div>
      </form>
    </article>
  );
}
export function PredictionHistory() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['pickem', 'history', page],
    queryFn: () => communityApi.history(page),
  });
  return (
    <>
      <PageHeading
        title="Lịch sử dự đoán"
        action={
          <Link className="button primary" to="/pickem">
            Dự đoán tiếp
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
        <section className="panel table-panel">
          <Table>
            <thead>
              <tr>
                <th>Giải / Trận</th>
                <th>Dự đoán</th>
                <th>Kết quả thực tế</th>
                <th>Trạng thái</th>
                <th>Điểm</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((p) => (
                <tr key={p._id}>
                  <td>
                    {p.tournamentId?.name || 'Giải không còn tồn tại'}
                    <small className="block muted">
                      Vòng {p.matchId?.round} · Trận {p.matchId?.position}
                    </small>
                  </td>
                  <td>
                    {p.predictedTeam1Id?.name || '—'} {p.predictedTeam1Score} : {p.predictedTeam2Score}{' '}
                    {p.predictedTeam2Id?.name || '—'}
                  </td>
                  <td>
                    {p.actualResult ? (
                      <>
                        {typeof p.matchId?.teamAId === 'object' ? p.matchId.teamAId?.name : '—'}{' '}
                        {p.actualResult.teamAScore} : {p.actualResult.teamBScore}{' '}
                        {typeof p.matchId?.teamBId === 'object' ? p.matchId.teamBId?.name : '—'}
                      </>
                    ) : p.status === 'Cancelled' ? (
                      'Đã hủy'
                    ) : (
                      'Chưa có kết quả chính thức'
                    )}
                  </td>
                  <td>
                    <Status value={p.status} />
                  </td>
                  <td>{p.status === 'Scored' ? p.pointsAwarded : '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!query.data.data.length && <Empty>Chưa có dự đoán.</Empty>}
          <Pagination
            label="dự đoán"
            page={page}
            limit={10}
            total={query.data.pagination?.total || 0}
            onChange={setPage}
          />
        </section>
      )}
    </>
  );
}
export function PickemLeaderboard() {
  const query = useQuery({ queryKey: ['pickem', 'leaderboard'], queryFn: communityApi.leaderboard });
  return (
    <>
      <PageHeading
        title="Bảng xếp hạng Pick’em"
        description="Điểm được tính từ những dự đoán đã có kết quả chính thức."
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
        <section className="panel table-panel">
          <Table>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Người dự đoán</th>
                <th>Điểm</th>
                <th>Dự đoán đúng</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((row) => (
                <tr key={row.userId}>
                  <td>{row.rank <= 3 ? ['🥇', '🥈', '🥉'][row.rank - 1] : row.rank}</td>
                  <td>
                    <span className="account-cell">
                      <Avatar name={row.fullName} url={row.avatarUrl} />
                      {row.fullName}
                    </span>
                  </td>
                  <td>{row.points}</td>
                  <td>
                    {row.correctPredictions} / {row.totalPredictions}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!query.data.length && <Empty>Chưa có dự đoán được chấm điểm.</Empty>}
        </section>
      )}
    </>
  );
}
