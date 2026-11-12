import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ZoomIn, ZoomOut } from 'lucide-react';
import type { PublicFixture } from '../types/community';
import { Empty } from './management';
import { Avatar } from './ui';
import { BracketCanvas } from './BracketCanvas';
import { pickemLayout, PICK_HEIGHT, PICK_WIDTH } from '../utils/pickemLayout';
import { statusLabel } from '../utils/management';

export function BracketViewer({ matches }: { matches: PublicFixture[] }) {
  const [scale, setScale] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);
  if (!matches.length) return <Empty>Nhánh đấu chưa được công bố.</Empty>;
  const layout = pickemLayout(matches);
  const placeholder = (match: PublicFixture, slot: number) => {
    if (match.isBye) return 'Miễn vòng';
    if (match.section === 'Reset') return slot === 0 ? 'Đội từ nhánh thắng' : 'Đội từ nhánh thua';
    const targetSlot = slot === 0 ? 'TeamA' : 'TeamB';
    const feeder = matches.find(
      (f) =>
        (f.nextMatchId === match._id && f.nextMatchSlot === targetSlot) ||
        (f.loserNextMatchId === match._id && f.loserNextMatchSlot === targetSlot),
    );
    return feeder
      ? `${feeder.nextMatchId === match._id ? 'Thắng' : 'Thua'} ${layout.nodes.get(feeder._id)?.code}`
      : 'Chưa xác định';
  };
  return (
    <div className="pickem-experience public-bracket-viewer">
      <div className="pe-board-toolbar">
        <div>
          <h2>Nhánh đấu</h2>
          <span className="pe-public-subtitle">
            {matches.filter((m) => m.result).length} trận hoàn tất ·{' '}
            {matches.filter((m) => m.enabled !== false && !m.isBye).length} trận thi đấu
          </span>
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
      <div className="pe-public-legend pe-legend">
        <span className="pe-line-key">Đội thắng đi tiếp</span>
        <span className="pe-line-key loser">Đội thua xuống nhánh</span>
        <span>Đội thắng được tô sáng</span>
      </div>
      <div
        className="pe-bracket-scroll public-bracket-scroll"
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label="Nhánh đấu công khai"
      >
        <BracketCanvas className="public-bracket" layout={layout} scale={scale}>
          {matches.map((m) => {
            const pos = layout.nodes.get(m._id);
            if (!pos) return null;
            const winner = m.result
              ? m.result.teamAScore > m.result.teamBScore
                ? 0
                : 1
              : m.isBye
                ? m.teamAId
                  ? 0
                  : 1
                : -1;
            return (
              <article
                key={m._id}
                className={`pe-match-node public-match-node ${m.enabled === false ? 'conditional' : ''}`}
                style={{ left: pos.x, top: pos.y, width: PICK_WIDTH, height: PICK_HEIGHT }}
                aria-label={`Vòng ${m.round} · Trận ${m.position}`}
              >
                <div className="pe-match-meta">
                  <strong>{pos.code}</strong>
                  <span>BO{m.bestOf}</span>
                  <span className="pe-verdict">
                    {m.enabled === false
                      ? 'Nếu cần'
                      : m.isBye
                        ? 'Miễn vòng'
                        : m.result
                          ? 'Kết thúc'
                          : m.status === 'Ongoing'
                            ? 'Đang đấu'
                            : statusLabel[m.status] || 'Chưa đấu'}
                  </span>
                </div>
                {[m.teamAId, m.teamBId].map((value, index) => {
                  const team = typeof value === 'object' ? value : null;
                  return (
                    <div
                      key={index}
                      className={`pe-team-row ${winner === index ? 'selected' : ''}`}
                      title={team?.name || placeholder(m, index)}
                    >
                      {team ? (
                        <Avatar name={team.name} url={team.logoUrl} />
                      ) : (
                        <span className="pe-empty-logo">?</span>
                      )}
                      <span>{team?.tag || team?.name || placeholder(m, index)}</span>
                      <b>{m.result ? (index === 0 ? m.result.teamAScore : m.result.teamBScore) : '–'}</b>
                    </div>
                  );
                })}
                <Link className="pe-node-footer" to={`/matches/${m._id}`}>
                  Chi tiết trận đấu <ArrowRight size={11} />
                </Link>
              </article>
            );
          })}
        </BracketCanvas>
      </div>
      <p className="pe-board-hint">
        Cuộn để xem toàn bộ nhánh. Chọn “Chi tiết trận đấu” để xem lịch và kết quả chính thức.
      </p>
    </div>
  );
}
