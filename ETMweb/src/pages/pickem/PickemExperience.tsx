import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  LockKeyhole,
  Trophy,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { communityApi } from '../../services/community';
import { Avatar, Modal, QueryError, Spinner } from '../../components/ui';
import { Empty } from '../../components/management';
import { CountdownTimer, useDeadline } from '../../components/CountdownTimer';
import { refId, type Team } from '../../types/management';
import type { PickemEvent, PredictionMatch } from '../../types/community';
import { pickemLayout, PICK_HEIGHT, PICK_WIDTH } from '../../utils/pickemLayout';
import { PredictionEditor } from './PickemPages';
import { BracketCanvas } from '../../components/BracketCanvas';
import '../../styles/pickem.css';

const date = (value?: string) =>
  value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa công bố';
function windowState(event: PickemEvent) {
  const now = Date.now(),
    open = Date.parse(event.predictionWindow.opensAt),
    lock = Date.parse(event.predictionWindow.locksAt);
  if (now < open) return { key: 'upcoming', label: 'Sắp mở dự đoán' };
  if (now < lock && event.matches.some((m) => m.canPredict)) return { key: 'open', label: 'Đang mở dự đoán' };
  return {
    key: 'locked',
    label: event.tournamentId.status === 'Completed' ? 'Đã kết thúc' : 'Đã khóa dự đoán',
  };
}
export function PickemPage() {
  const [params, setParams] = useSearchParams();
  const query = useQuery({
    queryKey: ['pickem', 'events'],
    queryFn: communityApi.events,
    refetchInterval: 30000,
  });
  const id = params.get('tournamentId');
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
  const selected = id ? query.data.find((e) => e.tournamentId._id === id) : null;
  if (selected) return <PickemTournament key={selected._id} event={selected} onBack={() => setParams({})} />;
  const events = [...query.data].sort((a, b) => {
    const order = { open: 0, upcoming: 1, locked: 2 };
    return (
      order[windowState(a).key as keyof typeof order] - order[windowState(b).key as keyof typeof order] ||
      Date.parse(b.tournamentId.startAt) - Date.parse(a.tournamentId.startAt)
    );
  });
  const years = [...new Set(events.map((e) => new Date(e.tournamentId.startAt).getFullYear()))];
  return (
    <div className="pickem-experience">
      <header className="pe-hero">
        <div>
          <span className="pe-kicker">YOUR BRACKET. YOUR CALL.</span>
          <h1>
            PICK<span>’</span>EM
          </h1>
          <p>Chọn đội chiến thắng. Vẽ hành trình đến ngôi vô địch.</p>
        </div>
        <Trophy className="pe-hero-trophy" size={116} strokeWidth={1} aria-hidden="true" />
      </header>
      <nav className="pe-navigation" aria-label="Điều hướng Pick’em">
        <span>Sự kiện</span>
        <Link to="/pickem/history">Dự đoán của tôi</Link>
        <Link to="/pickem/leaderboard">
          Bảng xếp hạng <ArrowRight size={14} />
        </Link>
      </nav>
      {id && !selected && (
        <p className="pe-notice">
          Giải này chưa công bố sự kiện Pick’em. Chọn một giải bên dưới để tiếp tục.
        </p>
      )}
      {!events.length && <Empty>Chưa có nhánh đấu Pick’em được công bố.</Empty>}
      {years.map((year) => (
        <section className="pe-season" key={year}>
          <div className="pe-season-heading">
            <h2>Sự kiện {year}</h2>
            <span>Chọn giải để bắt đầu dự đoán</span>
          </div>
          {events
            .filter((e) => new Date(e.tournamentId.startAt).getFullYear() === year)
            .map((e) => {
              const state = windowState(e);
              const game = e.tournamentId.gameId;
              return (
                <Link
                  key={e._id}
                  to={`/pickem?tournamentId=${e.tournamentId._id}`}
                  className={`pe-event-card ${state.key}`}
                  style={
                    e.tournamentId.bannerUrl
                      ? {
                          backgroundImage: `linear-gradient(90deg, #07101bf2, #07101b80), url("${e.tournamentId.bannerUrl.replaceAll('"', '%22')}")`,
                        }
                      : undefined
                  }
                >
                  <div className="pe-event-top">
                    <span className={`pe-state ${state.key}`}>
                      {state.key === 'open' ? <span className="pe-live-dot" /> : <LockKeyhole size={12} />}{' '}
                      {state.label}
                    </span>
                    <ArrowRight size={20} />
                  </div>
                  <div className="pe-event-bottom">
                    <div>
                      <p className="pe-game">
                        {typeof game === 'object' ? game.name : 'ESPORTS'} ·{' '}
                        {e.tournamentId.tournamentType === 'DoubleElimination'
                          ? 'Hai nhánh'
                          : e.tournamentId.tournamentType === 'RoundRobin'
                            ? 'Vòng tròn'
                            : 'Loại trực tiếp'}
                      </p>
                      <h3>{e.tournamentId.name}</h3>
                      <p>
                        {date(e.tournamentId.startAt)} — {date(e.tournamentId.endAt)}
                      </p>
                    </div>
                    <div className="pe-stats">
                      <div>
                        <strong>{e.summary.points} điểm</strong>
                        <small>ĐIỂM CỦA BẠN</small>
                      </div>
                      <div>
                        <strong>
                          {e.summary.picked}/{e.summary.total}
                        </strong>
                        <small>ĐÃ DỰ ĐOÁN</small>
                      </div>
                    </div>
                  </div>
                  <span className="pe-event-cta">
                    {state.key === 'open' ? 'Lựa chọn của tôi' : 'Xem nhánh đấu'} <ArrowRight size={14} />
                  </span>
                </Link>
              );
            })}
        </section>
      ))}
      <details className="pe-guide">
        <summary>
          <CircleHelp size={16} /> Cách tham gia Pick’em
        </summary>
        <ol>
          <li>Chọn một giải có nhánh đấu đã được công bố.</li>
          <li>Chọn đội thắng và tỉ số từ vòng đầu; đội thắng và đội thua sẽ đi đến đúng nhánh tiếp theo.</li>
          <li>
            Lưu từng trận trước giờ khóa. Thay đổi đội thắng sẽ xóa những lựa chọn phụ thuộc để bạn chọn lại.
          </li>
          <li>Sau khi có kết quả chính thức, xem điểm và lựa chọn đúng/sai trên nhánh đấu.</li>
        </ol>
      </details>
    </div>
  );
}
function PickemTournament({ event, onBack }: { event: PickemEvent; onBack: () => void }) {
  const layout = pickemLayout(event.matches);
  const [scale, setScale] = useState(1);
  const [view, setView] = useState<'picks' | 'results'>('picks');
  const [editor, setEditor] = useState<{ id: string; winner?: string } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const { locked } = useDeadline(event.predictionWindow.locksAt);
  const teams = new Map<string, Team>();
  for (const m of event.matches)
    for (const t of [
      m.teamAId,
      m.teamBId,
      m.myPrediction?.predictedTeam1Id,
      m.myPrediction?.predictedTeam2Id,
      m.availableParticipants.teamAId,
      m.availableParticipants.teamBId,
    ])
      if (t && typeof t === 'object') teams.set(t._id, t);
  const selected = editor ? event.matches.find((m) => m._id === editor.id) : null;
  const eligible = event.matches.filter((m) => m.enabled !== false && !m.isBye && m.status !== 'Cancelled');
  const points = event.matches.reduce(
    (sum, m) => sum + (m.myPrediction?.status === 'Scored' ? m.myPrediction.pointsAwarded : 0),
    0,
  );
  const maximum = eligible.reduce((sum, m) => sum + (m.event?.scoring?.exactScorePoints ?? 3), 0);
  const state = windowState(event);
  const open = state.key === 'open' && !locked;
  const remaining = eligible.filter((m) => !m.myPrediction || m.myPrediction.status === 'Cancelled').length;
  return (
    <div className="pickem-experience pickem-event">
      <header className="pe-detail-header">
        <button onClick={onBack} className="pe-back">
          <ArrowLeft size={15} /> Tất cả sự kiện
        </button>
        <div className="pe-detail-title">
          <div>
            <span className="pe-kicker">{event.tournamentId.name}</span>
            <h1>Lựa chọn của tôi</h1>
          </div>
          <div className="pe-stats">
            <div>
              <strong>{points} điểm</strong>
              <small>ĐIỂM CỦA BẠN</small>
            </div>
            <div>
              <strong>
                {eligible.length - remaining}/{eligible.length}
              </strong>
              <small>ĐÃ DỰ ĐOÁN</small>
            </div>
          </div>
        </div>
        <Link to={`/tournaments/${event.tournamentId._id}`}>
          Thông tin giải đấu <ArrowRight size={13} />
        </Link>
      </header>
      <div className="pe-detail-tabs" role="tablist" aria-label="Chế độ nhánh đấu">
        <button role="tab" aria-selected={view === 'picks'} onClick={() => setView('picks')}>
          Lựa chọn của tôi
        </button>
        <button role="tab" aria-selected={view === 'results'} onClick={() => setView('results')}>
          Kết quả chính thức
        </button>
        <Link to="/pickem/leaderboard">
          Bảng xếp hạng <ArrowRight size={13} />
        </Link>
      </div>
      <div className="pe-tournament-status">
        <div>
          <span className={`pe-state ${state.key}`}>{state.label}</span>
          {open ? (
            <CountdownTimer deadline={event.predictionWindow.locksAt} />
          ) : (
            <span>
              {state.key === 'upcoming'
                ? `Mở lúc ${date(event.predictionWindow.opensAt)}`
                : `Khóa lúc ${date(event.predictionWindow.locksAt)}`}
            </span>
          )}
        </div>
        <strong>
          {open
            ? remaining
              ? `Còn ${remaining} trận cần chọn`
              : 'Đã lưu đầy đủ lựa chọn'
            : `TỔNG: ${points} / ${maximum} điểm`}
        </strong>
      </div>
      <div className="pe-board-toolbar">
        <div className="pe-legend">
          <span>
            <Check size={13} /> Đúng
          </span>
          <span>
            <X size={13} /> Sai
          </span>
          <span>★ Chưa chấm điểm</span>
          <span className="pe-line-key">Thắng đi tiếp</span>
          <span className="pe-line-key loser">Thua xuống nhánh</span>
        </div>
        <div className="pe-zoom">
          <button
            aria-label="Thu nhỏ nhánh đấu"
            disabled={scale <= 0.5}
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
          >
            <ZoomOut size={17} />
          </button>
          <span>{Math.round(scale * 100)}%</span>
          <button
            aria-label="Phóng to nhánh đấu"
            disabled={scale >= 1.3}
            onClick={() => setScale((s) => Math.min(1.3, s + 0.1))}
          >
            <ZoomIn size={17} />
          </button>
          <button
            onClick={() =>
              setScale(
                Math.min(1, Math.max(0.5, ((scroller.current?.clientWidth || 1000) - 24) / layout.width)),
              )
            }
          >
            Vừa khung
          </button>
        </div>
      </div>
      <div
        className="pe-bracket-scroll"
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label="Sơ đồ nhánh đấu Pick’em, cuộn ngang và dọc để xem đầy đủ"
      >
        <BracketCanvas layout={layout} scale={scale}>
          {event.matches.map((m) => {
            const pos = layout.nodes.get(m._id);
            if (!pos) return null;
            return (
              <BracketPick
                key={m._id}
                match={{ ...m, canPredict: m.canPredict && open }}
                matches={event.matches}
                teams={teams}
                code={pos.code}
                view={view}
                style={{ left: pos.x, top: pos.y, width: PICK_WIDTH, height: PICK_HEIGHT }}
                onSelect={(winner) => setEditor({ id: m._id, winner })}
              />
            );
          })}
        </BracketCanvas>
      </div>
      <p className="pe-board-hint">
        Cuộn để xem toàn bộ nhánh.{' '}
        {view === 'picks'
          ? 'Chọn một đội để nhập tỉ số và lưu dự đoán.'
          : 'Kết quả chỉ hiển thị sau khi ban tổ chức xác nhận.'}{' '}
        Trận tái đấu chung kết chỉ diễn ra khi đội từ nhánh thua thắng chung kết tổng.
      </p>
      <details className="pe-guide">
        <summary>
          <CircleHelp size={16} /> Thể lệ & đội tham dự
        </summary>
        <p>
          Dự đoán đúng đội thắng: {event.matches[0]?.event?.scoring?.winnerPoints ?? 1} điểm. Đúng cả tỉ số:{' '}
          {event.matches[0]?.event?.scoring?.exactScorePoints ?? 3} điểm tổng cộng. Các lựa chọn được lưu
          riêng cho từng trận. Thay đổi đội thắng hoặc xóa dự đoán sẽ xóa các lựa chọn ở nhánh phụ thuộc.
        </p>
        <div className="pe-team-catalog">
          {[...teams.values()].map((t) => (
            <div key={t._id}>
              <Avatar name={t.name} url={t.logoUrl} />
              <span>
                {t.name}
                <small>{t.tag}</small>
              </span>
            </div>
          ))}
        </div>
      </details>
      {selected && (
        <Modal
          title={`${layout.nodes.get(selected._id)?.code} · ${view === 'results' ? 'Kết quả trận đấu' : 'Dự đoán của bạn'}`}
          onClose={() => setEditor(null)}
        >
          {view === 'results' ? (
            <div className="pe-result-detail">
              {[selected.teamAId, selected.teamBId].map((value, index) => {
                const team = typeof value === 'object' ? value : teams.get(refId(value));
                return (
                  <p key={index}>
                    {team && <Avatar name={team.name} url={team.logoUrl} />} {team?.name || 'Chưa xác định'}{' '}
                    <strong>
                      {selected.result
                        ? index === 0
                          ? selected.result.teamAScore
                          : selected.result.teamBScore
                        : '–'}
                    </strong>
                  </p>
                );
              })}
              <p>
                {selected.result ? 'Kết quả đã được ban tổ chức xác nhận.' : 'Chưa có kết quả chính thức.'}
              </p>
              <Link to={`/matches/${selected._id}`}>Chi tiết trận đấu →</Link>
            </div>
          ) : (
            <PredictionEditor
              key={`${selected._id}:${refId(selected.myPrediction?.predictedWinnerTeamId)}`}
              match={{ ...selected, canPredict: selected.canPredict && open }}
              teams={teams}
              initialWinner={editor?.winner}
              onSaved={() => setEditor(null)}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
function BracketPick({
  match: m,
  matches,
  teams,
  code,
  view,
  style,
  onSelect,
}: {
  match: PredictionMatch;
  matches: PredictionMatch[];
  teams: Map<string, Team>;
  code: string;
  view: 'picks' | 'results';
  style: React.CSSProperties;
  onSelect: (winner?: string) => void;
}) {
  const pred = m.myPrediction?.status === 'Cancelled' ? null : m.myPrediction;
  const participants =
    view === 'results'
      ? [m.teamAId, m.teamBId]
      : pred
        ? [pred.predictedTeam1Id, pred.predictedTeam2Id]
        : [m.availableParticipants.teamAId, m.availableParticipants.teamBId];
  const actual = view === 'results';
  const winner =
    actual && m.result
      ? refId(m.result.teamAScore > m.result.teamBScore ? m.teamAId : m.teamBId)
      : !actual
        ? refId(pred?.predictedWinnerTeamId)
        : '';
  const ready = participants.every((t) => !!refId(t));
  const verdict = pred?.status === 'Scored' ? (pred.isCorrect ? 'correct' : 'wrong') : '';
  const placeholder = (slot: number) => {
    if (m.isBye) return 'Miễn vòng';
    if (m.section === 'Reset') return slot === 0 ? 'Đội từ nhánh thắng' : 'Đội từ nhánh thua';
    const feeder = matches.find(
      (f) =>
        (f.nextMatchId === m._id && f.nextMatchSlot === (slot === 0 ? 'TeamA' : 'TeamB')) ||
        (f.loserNextMatchId === m._id && f.loserNextMatchSlot === (slot === 0 ? 'TeamA' : 'TeamB')),
    );
    return feeder
      ? `${feeder.nextMatchId === m._id ? 'Thắng' : 'Thua'} ${feeder.section === 'Losers' ? 'L' : 'W'}${feeder.round}-${feeder.position}`
      : 'Chưa xác định';
  };
  return (
    <article
      className={`pe-match-node ${verdict} ${m.enabled === false ? 'conditional' : ''}`}
      style={style}
      aria-label={`Dự đoán vòng ${m.round} trận ${m.position}`}
    >
      <div className="pe-match-meta">
        <strong>{code}</strong>
        <span>BO{m.bestOf}</span>
        <span className="pe-verdict">
          {pred?.status === 'Scored' ? (
            pred.isCorrect ? (
              <>
                <Check size={12} />
                {pred.pointsAwarded}đ
              </>
            ) : (
              <X size={13} />
            )
          ) : pred ? (
            '★'
          ) : m.enabled === false ? (
            'Nếu cần'
          ) : m.isBye ? (
            'BYE'
          ) : m.canPredict ? (
            'Chọn đội'
          ) : (
            <LockKeyhole size={12} />
          )}
        </span>
      </div>
      {participants.map((value, index) => {
        const t = typeof value === 'object' ? value : teams.get(refId(value));
        const id = refId(value);
        const score = actual
          ? index === 0
            ? m.result?.teamAScore
            : m.result?.teamBScore
          : pred
            ? index === 0
              ? pred.predictedTeam1Score
              : pred.predictedTeam2Score
            : undefined;
        return (
          <button
            key={index}
            className={`pe-team-row ${winner && winner === id ? 'selected' : ''}`}
            title={t?.name || placeholder(index)}
            disabled={actual || !ready || !m.canPredict}
            onClick={() => onSelect(id)}
            aria-label={`Chọn ${t?.name || placeholder(index)} thắng ${code}`}
            aria-pressed={!!winner && winner === id}
          >
            {t ? <Avatar name={t.name} url={t.logoUrl} /> : <span className="pe-empty-logo">?</span>}
            <span>{t?.tag || t?.name || placeholder(index)}</span>
            <b>{score ?? '–'}</b>
          </button>
        );
      })}
      <button className="pe-node-footer" onClick={() => onSelect()}>
        {actual
          ? 'Chi tiết kết quả'
          : m.isBye
            ? 'Miễn vòng'
            : !ready
              ? 'Chọn trận trước để tiếp tục'
              : pred
                ? m.canPredict
                  ? 'Xem / sửa lựa chọn'
                  : 'Xem lựa chọn'
                : m.canPredict
                  ? 'Chưa có lựa chọn'
                  : 'Xem trận đấu'}{' '}
        <ArrowRight size={11} />
      </button>
    </article>
  );
}
