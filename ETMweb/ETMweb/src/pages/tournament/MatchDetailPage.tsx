import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { competitionApi } from '../../services/competition';
import { save } from '../../services/management';
import { Alert, Button, Modal, PageHeading, QueryError, Spinner, Table } from '../../components/ui';
import { ConfirmAction, DataForm, Empty, Status } from '../../components/management';
import { DocumentLinks, DocumentUpload } from '../../components/DocumentUpload';
import {
  GameFields,
  StatisticFields,
  StatisticValue,
  type GameField,
  type StatisticField,
} from '../../components/ResultFields';
import { refId } from '../../types/management';
import type { Fixture, Result } from '../../types/competition';
import { formatDate } from '../../utils/account';
import { localDate } from '../../utils/management';
import { safeDocumentUrl, validScore } from '../../utils/competition';
export function MatchDetailPage() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['match', id], queryFn: () => competitionApi.match(id) });
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
  const { match: m, result, audit } = query.data;
  const teamName = (team: Fixture['teamAId']) => (typeof team === 'object' ? team?.name || 'TBD' : 'TBD');
  const ready = !!m.teamAId && !!m.teamBId && !m.isBye && m.enabled !== false;
  const editable = !['Completed', 'Cancelled'].includes(m.status);
  return (
    <>
      <Link to={`/to/tournaments/${m.tournamentId}/matches`}>← Danh sách trận đấu</Link>
      <PageHeading
        title={`${teamName(m.teamAId)} — ${teamName(m.teamBId)}`}
        description={`${m.section} · Vòng ${m.round} · Trận ${m.position} · BO${m.bestOf}`}
      />
      <Status value={m.status} />
      <div className="dashboard-grid spaced">
        <section className="panel">
          <h2>Lịch thi đấu</h2>
          <dl className="detail-facts">
            <dt>Thời gian</dt>
            <dd>{formatDate(m.scheduledAt, true)}</dd>
            <dt>Địa điểm</dt>
            <dd>{m.venue || 'Chưa cập nhật'}</dd>
            <dt>Trọng tài</dt>
            <dd>{m.referee || 'Chưa phân công'}</dd>
            <dt>Stream</dt>
            <dd>
              {m.streamUrl && safeDocumentUrl(m.streamUrl) ? (
                <a href={m.streamUrl} target="_blank" rel="noopener noreferrer">
                  Xem stream ↗
                </a>
              ) : (
                'Chưa cập nhật'
              )}
            </dd>
          </dl>
          {m.postponeReason && <p className="prose">Lý do hoãn: {m.postponeReason}</p>}
          <div className="form-actions">
            {editable && !m.isBye && (
              <Button variant="secondary" onClick={() => setAction('schedule')}>
                Lập / sửa lịch
              </Button>
            )}
            {editable && (
              <Button variant="secondary" onClick={() => setAction('postpone')}>
                Hoãn trận
              </Button>
            )}
            {editable && ready && (
              <Button variant="danger" onClick={() => setAction('forfeit')}>
                Xử thua
              </Button>
            )}
          </div>
        </section>
        <section className="panel">
          <h2>Kết quả trận</h2>
          {result ? (
            <>
              <p className="scoreline">
                {result.teamAScore} : {result.teamBScore}
              </p>
              <Status value={result.status} />
              <p className="muted small">
                Phiên bản {result.revision}
                {result.isForfeit ? ' · Forfeit' : ''}
              </p>
              {result.correctionReason && (
                <p className="prose">Lý do điều chỉnh: {result.correctionReason}</p>
              )}
              <h3 className="spaced">Thống kê</h3>
              <StatisticValue value={result.statistics || {}} />
              {!!result.games?.length && (
                <Table>
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Team A</th>
                      <th>Team B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.games.map((game, i) => (
                      <tr key={i}>
                        <td>{game.game}</td>
                        <td>{game.teamAScore}</td>
                        <td>{game.teamBScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              <DocumentLinks urls={result.evidenceUrls || []} />
            </>
          ) : (
            <Empty>Chưa có kết quả.</Empty>
          )}
          <div className="form-actions">
            {ready && m.status !== 'Cancelled' && (
              <Button onClick={() => setAction('result')}>
                {result ? 'Chỉnh sửa kết quả' : 'Nhập kết quả'}
              </Button>
            )}
            {result?.status === 'Draft' && (
              <Button
                disabled={!validScore(result.teamAScore, result.teamBScore, m.bestOf, true)}
                onClick={() => setAction('confirm')}
              >
                Xác nhận chính thức
              </Button>
            )}
          </div>
          {result?.status === 'Draft' &&
            !validScore(result.teamAScore, result.teamBScore, m.bestOf, true) && (
              <p className="muted small">
                Cần đội thắng đạt {Math.floor(m.bestOf / 2) + 1} ván trước khi xác nhận.
              </p>
            )}
        </section>
      </div>
      <section className="panel spaced">
        <h2>Audit cập nhật tỉ số</h2>
        <Table>
          <thead>
            <tr>
              <th>Người cập nhật</th>
              <th>Thời gian</th>
              <th>Trước</th>
              <th>Sau</th>
              <th>Lý do</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((a) => (
              <tr key={a._id}>
                <td>{a.actorId?.fullName || 'Tài khoản không còn tồn tại'}</td>
                <td>{formatDate(a.createdAt, true)}</td>
                <td>
                  {a.previousScore?.teamAScore === undefined
                    ? '—'
                    : `${a.previousScore.teamAScore} : ${a.previousScore.teamBScore}`}
                </td>
                <td>
                  {a.newScore.teamAScore} : {a.newScore.teamBScore}
                </td>
                <td className="wrap-cell">{a.reason || a.action}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!audit.length && <Empty>Chưa có thay đổi tỉ số.</Empty>}
        <p className="muted small">Hiển thị tối đa 200 thay đổi gần nhất của trận này.</p>
      </section>
      {action === 'schedule' && (
        <DataForm
          title="Lập lịch trận đấu"
          defaults={{
            scheduledAt: localDate(m.scheduledAt),
            bestOf: m.bestOf,
            referee: m.referee || '',
            venue: m.venue || '',
            streamUrl: m.streamUrl || '',
          }}
          fields={[
            { name: 'scheduledAt', label: 'Thời gian thi đấu', type: 'datetime-local', required: true },
            {
              name: 'bestOf',
              label: 'Best of',
              options: [1, 3, 5, 7, 9].map((n) => ({ value: String(n), label: `BO${n}` })),
            },
            { name: 'referee', label: 'Trọng tài' },
            { name: 'venue', label: 'Địa điểm' },
            { name: 'streamUrl', label: 'URL stream' },
          ]}
          onClose={() => setAction('')}
          submit={async (v) => {
            if (v.streamUrl && !safeDocumentUrl(v.streamUrl)) throw new Error('Stream phải là URL HTTP(S).');
            await save(
              `/matches/${id}/schedule`,
              { ...v, scheduledAt: new Date(v.scheduledAt).toISOString(), bestOf: Number(v.bestOf) },
              'put',
            );
          }}
        />
      )}
      {action === 'result' && <ResultForm match={m} result={result} onClose={() => setAction('')} />}
      {action === 'forfeit' && (
        <DataForm
          title="Xử thua đội bỏ cuộc"
          defaults={{ losingTeamId: '' }}
          fields={[
            {
              name: 'losingTeamId',
              label: 'Đội bị xử thua',
              required: true,
              options: [
                { value: '', label: 'Chọn đội' },
                ...[m.teamAId, m.teamBId].map((t) => ({ value: refId(t), label: teamName(t) })),
              ],
            },
            { name: 'reason', label: 'Lý do xử thua', type: 'textarea', required: true },
          ]}
          onClose={() => setAction('')}
          submit={async (v) => {
            await save(`/matches/${id}/forfeit`, v);
          }}
        />
      )}
      {['confirm', 'postpone'].includes(action) && (
        <ConfirmAction
          title={action === 'confirm' ? 'Xác nhận kết quả chính thức?' : 'Hoãn trận đấu?'}
          description={
            action === 'confirm'
              ? 'Kết quả sẽ cập nhật standings, đội đi tiếp và điểm dự đoán liên quan.'
              : 'Ghi nhận lý do hoãn trước khi sắp xếp lại lịch.'
          }
          reason={action === 'postpone'}
          onClose={() => setAction('')}
          action={(reason) =>
            save(`/matches/${id}/${action === 'confirm' ? 'results/confirm' : 'postpone'}`, { reason })
          }
        />
      )}
    </>
  );
}
function ResultForm({
  match,
  result,
  onClose,
}: {
  match: Fixture;
  result: Result | null;
  onClose: () => void;
}) {
  const [a, setA] = useState(String(result?.teamAScore ?? 0));
  const [b, setB] = useState(String(result?.teamBScore ?? 0));
  const [statistics, setStatistics] = useState<StatisticField[]>(
    Object.entries(result?.statistics || {}).map(([name, value]) => ({
      name,
      value: typeof value === 'object' ? 'Dữ liệu chi tiết hiện có' : String(value),
      structured: typeof value === 'object',
      original: value,
    })),
  );
  const [games, setGames] = useState<GameField[]>(result?.games || []);
  const [reason, setReason] = useState('');
  const [documents, setDocuments] = useState(result?.evidenceUrls || []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  return (
    <Modal title={result ? 'Chỉnh sửa kết quả' : 'Nhập kết quả'} onClose={onClose}>
      <Alert>{error}</Alert>
      {result?.status === 'Confirmed' && (
        <Alert kind="info">
          Sửa kết quả chính thức sẽ tính lại standings, bracket và Pick’em. Không thể đổi đội thắng nếu đã có
          kết quả chính thức ở trận sau.
        </Alert>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (uploading) return;
          setError('');
          if (!validScore(Number(a), Number(b), match.bestOf, result?.status === 'Confirmed')) {
            setError(
              `Tỉ số phải khác nhau, không âm, tối đa ${Math.floor(match.bestOf / 2) + 1} ván thắng và phù hợp BO${match.bestOf}.`,
            );
            return;
          }
          if (new Set(statistics.map((row) => row.name.trim())).size !== statistics.length) {
            setError('Tên thống kê không được trùng nhau.');
            return;
          }
          const stats = Object.fromEntries(
            statistics.map((row) => [
              row.name.trim(),
              row.structured
                ? row.original
                : row.value.trim() !== '' && Number.isFinite(Number(row.value))
                  ? Number(row.value)
                  : row.value,
            ]),
          );
          const gameRows = games;
          if (
            !Array.isArray(gameRows) ||
            gameRows.some(
              (g) =>
                !g ||
                ![g.game, g.teamAScore, g.teamBScore].every(Number.isInteger) ||
                g.game < 1 ||
                g.teamAScore < 0 ||
                g.teamBScore < 0,
            )
          ) {
            setError('Mỗi ván cần game > 0, teamAScore và teamBScore là số nguyên không âm.');
            return;
          }
          setBusy(true);
          try {
            await save(
              `/matches/${match._id}/results`,
              {
                teamAScore: Number(a),
                teamBScore: Number(b),
                statistics: stats,
                games: gameRows,
                evidenceUrls: documents,
                correctionReason: reason,
              },
              result ? 'put' : 'post',
            );
            await client.invalidateQueries();
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="score-fields">
          <div className="field">
            <label htmlFor="score-a">Tỉ số Team A</label>
            <input
              id="score-a"
              required
              type="number"
              min={0}
              step={1}
              value={a}
              onChange={(e) => setA(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="score-b">Tỉ số Team B</label>
            <input
              id="score-b"
              required
              type="number"
              min={0}
              step={1}
              value={b}
              onChange={(e) => setB(e.target.value)}
            />
          </div>
        </div>
        <StatisticFields value={statistics} onChange={setStatistics} />
        <GameFields value={games} onChange={setGames} />
        {result && (
          <div className="field">
            <label htmlFor="result-reason">Lý do chỉnh sửa</label>
            <textarea
              id="result-reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}
        <DocumentUpload
          scope="match"
          entityId={match._id}
          value={documents}
          onChange={setDocuments}
          onBusy={setUploading}
        />
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" busy={busy} disabled={uploading}>
            Lưu kết quả
          </Button>
        </div>
      </form>
    </Modal>
  );
}
