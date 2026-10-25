import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { communityApi } from '../../services/community';
import { managementApi } from '../../services/management';
import {
  Avatar,
  Button,
  PageHeading,
  Pagination,
  QueryError,
  Spinner,
  Table,
  Alert,
} from '../../components/ui';
import { Empty, Status } from '../../components/management';
import { BracketViewer } from '../../components/BracketViewer';
import { ReportViolation } from '../../components/ReportViolation';
import { formatDate, homeFor } from '../../utils/account';
import { useAuth } from '../../contexts/AuthContext';
import { cleanHtml, statusLabel } from '../../utils/management';
import { safeDocumentUrl } from '../../utils/competition';
import { formatPrize, registrationState } from '../../utils/tournament';
import { gameName, refId, type Tournament } from '../../types/management';
import type { Article, PublicStanding, PublicFixture } from '../../types/community';
function PickemEntry({ id, label }: { id?: string; label: string }) {
  const { user } = useAuth();
  return (
    <Link
      className="button primary"
      to={
        user && user.systemRole !== 'Customer' ? homeFor(user) : `/pickem${id ? `?tournamentId=${id}` : ''}`
      }
    >
      {user && user.systemRole !== 'Customer' ? 'Vào không gian làm việc' : label}
    </Link>
  );
}
function TournamentEntry({ tournament }: { tournament: Tournament }) {
  const { user } = useAuth();
  if (user?.systemRole !== 'ClubManager') return <PickemEntry id={tournament._id} label="Dự đoán giải đấu" />;
  const state = registrationState(tournament);
  return (
    <div className="spaced">
      {state === 'closed' ? (
        <>
          <Button disabled>Đã đóng đăng ký</Button>
          <p className="muted small">Giải đấu không còn nhận hồ sơ tham dự.</p>
        </>
      ) : (
        <>
          <Link className="button primary" to={`/cm/applications/new?tournamentId=${tournament._id}`}>
            Đăng ký tham gia
          </Link>
          {state === 'upcoming' && (
            <p className="muted small">Mở đăng ký lúc {formatDate(tournament.registrationOpenAt, true)}.</p>
          )}
        </>
      )}
    </div>
  );
}
export function TournamentCards({ items }: { items: Tournament[] }) {
  return items.length ? (
    <div className="public-cards">
      {items.map((t) => (
        <Link className="panel tournament-card" key={t._id} to={`/tournaments/${t._id}`}>
          {t.bannerUrl && <img className="tournament-card-image" src={t.bannerUrl} alt="" loading="lazy" />}
          <div className="card-game">
            <Avatar
              fit="contain"
              name={typeof t.gameId === 'object' ? t.gameId.name : 'Game'}
              url={typeof t.gameId === 'object' ? t.gameId.logoUrl : undefined}
            />
            <span>{gameName(t.gameId)}</span>
            <Status value={t.status} />
          </div>
          <h2>{t.name}</h2>
          <p>
            {t.region || 'Chưa công bố khu vực'} · {t.tournamentType}
          </p>
          <p className="muted small">
            Khởi tranh {formatDate(t.startAt)} · Tối đa {t.maxTeams} đội
          </p>
          <span className="text-link">Xem giải đấu →</span>
        </Link>
      ))}
    </div>
  ) : (
    <Empty>Chưa có giải đấu phù hợp.</Empty>
  );
}
function NewsCards({ items }: { items: Article[] }) {
  return items.length ? (
    <div className="public-cards">
      {items.map((a) => (
        <Link className="panel article-card" key={a._id} to={`/news/${a.slug}`}>
          {a.imageUrl && <img src={a.imageUrl} alt="" loading="lazy" />}
          <small className="muted">
            {a.type} · {formatDate(a.publishedAt)}
          </small>
          <h2>{a.title}</h2>
          <p className="muted">{a.summary}</p>
        </Link>
      ))}
    </div>
  ) : (
    <Empty>Chưa có bài viết.</Empty>
  );
}
export function PublicHome() {
  const { user } = useAuth();
  const spectator = !user || user.systemRole === 'Customer';
  const query = useQuery({
    queryKey: ['public', 'home', spectator ? 'spectator' : 'all'],
    queryFn: async () => {
      const [tournaments, news] = await Promise.all([
        communityApi.tournaments({ limit: 3, audience: spectator ? 'spectator' : undefined }),
        communityApi.news({ limit: 3 }),
      ]);
      return { tournaments: tournaments.data, news: news.data };
    },
  });
  return (
    <div className="public-container">
      <section className="community-hero">
        <p className="eyebrow">ETM ESPORTS</p>
        <h1>
          Theo dõi trận đấu.
          <br />
          <span>Chọn đội bạn tin tưởng.</span>
        </h1>
        <p>Khám phá giải đấu, theo dõi đội tuyển và dự đoán hành trình đến ngôi vô địch.</p>
        <div className="row-actions">
          <Link className="button primary" to="/tournaments">
            Khám phá giải đấu →
          </Link>
          <PickemEntry label="Tham gia Pick’em" />
        </div>
      </section>
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
          <PageHeading title="Giải đấu nổi bật" action={<Link to="/tournaments">Xem tất cả →</Link>} />
          <TournamentCards items={query.data.tournaments} />
          <div className="spaced">
            <PageHeading title="Tin tức mới nhất" action={<Link to="/news">Xem tất cả →</Link>} />
            <NewsCards items={query.data.news} />
          </div>
        </>
      )}
    </div>
  );
}
export function PublicTournaments() {
  const { user } = useAuth();
  const spectator = !user || user.systemRole === 'Customer';
  const statuses = spectator
    ? ['Ongoing', 'Completed']
    : ['RegistrationOpen', 'RegistrationClosed', 'Ongoing', 'Completed', 'Postponed', 'Cancelled'];
  const [params, setParams] = useSearchParams();
  const requestedStatus = params.get('status') || '';
  const status = statuses.includes(requestedStatus) ? requestedStatus : '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const games = useQuery({ queryKey: ['games'], queryFn: managementApi.games });
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const invalid = !!from && !!to && from > to;
  const filters = Object.fromEntries(params);
  const query = useQuery({
    queryKey: ['public', 'tournaments', spectator ? 'spectator' : 'all', params.toString()],
    queryFn: () =>
      communityApi.tournaments({
        ...filters,
        audience: spectator ? 'spectator' : undefined,
        status: status || undefined,
        page,
        limit: 9,
        from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
      }),
    enabled: !invalid,
  });
  function change(key: string, value: string) {
    setParams((p) => {
      const next = new URLSearchParams(p);
      value ? next.set(key, value) : next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  }
  return (
    <div className="public-container">
      <PageHeading
        title="Khám phá giải đấu"
        description={
          spectator
            ? 'Theo dõi các giải đấu đang diễn ra và đã hoàn tất.'
            : 'Lọc theo game, khu vực, thời gian và trạng thái.'
        }
      />
      <div className="public-filters">
        <input
          aria-label="Tìm giải công khai"
          placeholder="Tên giải đấu…"
          value={params.get('search') || ''}
          onChange={(e) => change('search', e.target.value)}
        />
        <select
          aria-label="Game giải đấu"
          value={params.get('gameId') || ''}
          onChange={(e) => change('gameId', e.target.value)}
        >
          <option value="">Tất cả game</option>
          {games.data?.map((g) => (
            <option value={g._id} key={g._id}>
              {g.name}
            </option>
          ))}
        </select>
        <input
          aria-label="Khu vực giải đấu"
          placeholder="Khu vực"
          value={params.get('region') || ''}
          onChange={(e) => change('region', e.target.value)}
        />
        <select
          aria-label="Trạng thái giải công khai"
          value={status}
          onChange={(e) => change('status', e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {statusLabel[s] || s}
            </option>
          ))}
        </select>
        <label>
          Từ ngày
          <input
            aria-label="Giải từ ngày"
            type="date"
            value={from}
            onChange={(e) => change('from', e.target.value)}
          />
        </label>
        <label>
          Đến ngày
          <input
            aria-label="Giải đến ngày"
            type="date"
            value={to}
            onChange={(e) => change('to', e.target.value)}
          />
        </label>
      </div>
      {invalid ? (
        <Alert>Ngày kết thúc bộ lọc không được trước ngày bắt đầu.</Alert>
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
        <>
          <TournamentCards items={query.data.data} />
          <Pagination
            label="giải đấu"
            page={page}
            limit={9}
            total={query.data.pagination?.total || 0}
            onChange={(p) => change('page', String(p))}
          />
        </>
      )}
    </div>
  );
}
export function StandingsTable({ rows }: { rows: PublicStanding[] }) {
  return rows.length ? (
    <Table>
      <thead>
        <tr>
          <th>Hạng</th>
          <th>Team</th>
          <th>Giải đấu</th>
          <th>Trận</th>
          <th>Thắng</th>
          <th>Thua</th>
          <th>Điểm</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r._id}>
            <td>{r.rank || '—'}</td>
            <td>{r.teamId?.name || '—'}</td>
            <td>{r.tournamentId?.name || '—'}</td>
            <td>{r.played}</td>
            <td>{r.wins}</td>
            <td>{r.losses}</td>
            <td>{r.points}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  ) : (
    <Empty>Chưa có bảng xếp hạng.</Empty>
  );
}
export function PublicTournamentDetail() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const query = useQuery({
    queryKey: ['public', 'tournament', id],
    queryFn: () => communityApi.tournament(id),
  });
  const fixtures = useQuery({ queryKey: ['public', 'matches', id], queryFn: () => communityApi.matches(id) });
  const standings = useQuery({
    queryKey: ['public', 'standings', id],
    queryFn: () => communityApi.standings({ tournamentId: id, limit: 100 }),
    enabled: tab === 'standings',
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
  const t = query.data;
  return (
    <div className="public-container">
      <Link to="/tournaments">← Danh sách giải</Link>
      {t.bannerUrl && <img className="article-cover" src={t.bannerUrl} alt="" />}
      <PageHeading title={t.name} description={`${gameName(t.gameId)} · ${t.tournamentType}`} />
      <Status value={t.status} />
      <div className="tabs spaced" role="tablist" aria-label="Thông tin giải công khai">
        {[
          ['overview', 'Tổng quan'],
          ['bracket', 'Nhánh đấu'],
          ['schedule', 'Lịch thi đấu'],
          ['teams', 'Đội tham dự'],
          ['standings', 'Xếp hạng'],
        ].map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setParams({ tab: key })}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'overview' ? (
        <section className="panel">
          <h2>Thông tin giải đấu</h2>
          <p className="prose">{t.description || 'Chưa có mô tả.'}</p>
          <dl className="detail-facts">
            <dt>Bắt đầu</dt>
            <dd>{formatDate(t.startAt, true)}</dd>
            <dt>Kết thúc</dt>
            <dd>{formatDate(t.endAt, true)}</dd>
            <dt>Khu vực</dt>
            <dd>{t.region || '—'}</dd>
            <dt>Giải thưởng</dt>
            <dd>{formatPrize(t)}</dd>
            <dt>Mở đăng ký</dt>
            <dd>{formatDate(t.registrationOpenAt, true)}</dd>
            <dt>Đóng đăng ký</dt>
            <dd>{formatDate(t.registrationCloseAt, true)}</dd>
          </dl>
          <h2 className="spaced">Điều lệ</h2>
          <p className="prose">{t.rules || 'Chưa cập nhật.'}</p>
          <TournamentEntry tournament={t} />
        </section>
      ) : tab === 'teams' ? (
        <section className="public-cards">
          {t.teams.map((team) => (
            <article className="panel" key={team._id}>
              <h2>{team.name}</h2>
              <Link to={`/clubs/${team.clubId}`}>Xem CLB →</Link>
            </article>
          ))}
          {!t.teams.length && <Empty>Chưa có đội tham dự được công bố.</Empty>}
        </section>
      ) : tab === 'standings' ? (
        standings.isPending ? (
          <Spinner />
        ) : standings.isError ? (
          <QueryError
            message={standings.error.message}
            retry={() => {
              void standings.refetch();
            }}
          />
        ) : (
          <section className="panel">
            <StandingsTable rows={standings.data.data} />
          </section>
        )
      ) : fixtures.isPending ? (
        <Spinner />
      ) : fixtures.isError ? (
        <QueryError
          message={fixtures.error.message}
          retry={() => {
            void fixtures.refetch();
          }}
        />
      ) : tab === 'bracket' ? (
        <section>
          <BracketViewer matches={fixtures.data} />
        </section>
      ) : (
        <section className="panel">
          <PublicSchedule matches={fixtures.data} />
        </section>
      )}
    </div>
  );
}
export function PublicSchedule({ matches }: { matches: PublicFixture[] }) {
  return matches.length ? (
    <Table>
      <thead>
        <tr>
          <th>Vòng</th>
          <th>Trận</th>
          <th>Thời gian</th>
          <th>Kết quả</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {matches.map((m) => (
          <tr key={m._id}>
            <td>{m.round}</td>
            <td>
              {typeof m.teamAId === 'object' ? m.teamAId?.name || 'TBD' : 'TBD'} —{' '}
              {typeof m.teamBId === 'object' ? m.teamBId?.name || 'TBD' : 'TBD'}
            </td>
            <td>{formatDate(m.scheduledAt, true)}</td>
            <td>{m.result ? `${m.result.teamAScore} : ${m.result.teamBScore}` : 'Chưa có kết quả'}</td>
            <td>
              <Link to={`/matches/${m._id}`}>Xem trận →</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  ) : (
    <Empty>Lịch thi đấu chưa được công bố.</Empty>
  );
}
export function PublicMatchDetail() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['public', 'match', id], queryFn: () => communityApi.publicMatch(id) });
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
  const { match: m, tournament: t, result } = query.data;
  const label = (team: typeof m.teamAId) => (typeof team === 'object' ? team?.name || 'TBD' : 'TBD');
  return (
    <div className="public-container">
      <Link to={`/tournaments/${t._id}`}>{t.name} →</Link>
      <PageHeading
        title={`${label(m.teamAId)} — ${label(m.teamBId)}`}
        description={`Vòng ${m.round} · BO${m.bestOf}`}
        action={
          <ReportViolation
            matchId={id}
            clubIds={[m.teamAId, m.teamBId].flatMap((team) =>
              typeof team === 'object' && team?.clubId ? [team.clubId] : [],
            )}
            context={t.name + ' · ' + label(m.teamAId) + ' — ' + label(m.teamBId)}
            eligible={m.enabled !== false && !m.isBye && m.status !== 'Cancelled'}
          />
        }
      />
      <section className="panel">
        <Status value={m.status} />
        <p className="scoreline">{result ? `${result.teamAScore} : ${result.teamBScore}` : '— : —'}</p>
        <p>
          {formatDate(m.scheduledAt, true)} · {m.venue || 'Chưa công bố địa điểm'}
        </p>
        {m.streamUrl && safeDocumentUrl(m.streamUrl) && (
          <a href={m.streamUrl} target="_blank" rel="noopener noreferrer">
            Xem trực tiếp ↗
          </a>
        )}
      </section>
    </div>
  );
}
export function PublicClubs() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('search') || '';
  const query = useQuery({
    queryKey: ['public', 'clubs', search, page],
    queryFn: () => communityApi.clubs({ search, page, limit: 9 }),
  });
  return (
    <div className="public-container">
      <PageHeading title="Câu lạc bộ esports" />
      <input
        aria-label="Tìm CLB công khai"
        placeholder="Tên câu lạc bộ…"
        value={search}
        onChange={(e) => setParams(e.target.value ? { search: e.target.value } : {})}
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
          <div className="public-cards spaced">
            {query.data.data.map((c) => (
              <Link className="panel" key={c._id} to={`/clubs/${c._id}`}>
                <Avatar large name={c.name} url={c.logoUrl} />
                <h2>{c.name}</h2>
                <p className="muted">{c.region || c.country || c.shortName}</p>
              </Link>
            ))}
          </div>
          {!query.data.data.length && <Empty />}
          <Pagination
            label="CLB"
            page={page}
            total={query.data.pagination?.total || 0}
            limit={9}
            onChange={(p) => setParams({ search, page: String(p) })}
          />
        </>
      )}
    </div>
  );
}
export function PublicClubDetail() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['public', 'club', id], queryFn: () => communityApi.club(id) });
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
  const c = query.data;
  return (
    <div className="public-container">
      <PageHeading title={c.name} description={`${c.country || ''} · ${c.region || c.shortName}`} />
      <section className="panel">
        <Avatar large name={c.name} url={c.logoUrl} />
        <p className="prose">{c.description || 'Chưa có mô tả.'}</p>
        <h2>Đội tuyển và thành viên</h2>
        <div className="public-cards spaced">
          {c.teams.map((team) => (
            <article className="panel" key={team._id}>
              <h3>{team.name}</h3>
              <p>{gameName(team.gameId)}</p>
              <Status value={team.status} />
              <ul>
                {c.members
                  .filter((m) => refId(m.teamId) === team._id)
                  .map((m) => (
                    <li key={m._id}>
                      {m.inGameName || 'Thành viên'} · {m.teamRole}
                    </li>
                  ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <section className="panel spaced">
        <h2>Thành tích</h2>
        <StandingsTable
          rows={c.standings.map((s) => ({
            ...s,
            teamId: c.teams.find((t) => t._id === refId(s.teamId)) || s.teamId,
          }))}
        />
      </section>
      <section className="panel spaced">
        <h2>Lịch sử thi đấu</h2>
        <PublicSchedule matches={c.matches} />
      </section>
    </div>
  );
}
export function PublicStandings() {
  const [game, setGame] = useState('');
  const [page, setPage] = useState(1);
  const games = useQuery({ queryKey: ['games'], queryFn: managementApi.games });
  const query = useQuery({
    queryKey: ['public', 'standings', game, page],
    queryFn: () => communityApi.standings({ gameId: game || undefined, page, limit: 15 }),
  });
  return (
    <div className="public-container">
      <PageHeading title="Bảng xếp hạng đội tuyển" />
      <select
        aria-label="Game xếp hạng"
        value={game}
        onChange={(e) => {
          setGame(e.target.value);
          setPage(1);
        }}
      >
        <option value="">Tất cả game</option>
        {games.data?.map((g) => (
          <option key={g._id} value={g._id}>
            {g.name}
          </option>
        ))}
      </select>
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
        <section className="panel spaced">
          <StandingsTable rows={query.data.data} />
          <Pagination
            label="dòng xếp hạng"
            page={page}
            limit={15}
            total={query.data.pagination?.total || 0}
            onChange={setPage}
          />
        </section>
      )}
    </div>
  );
}
export function PublicNews() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const query = useQuery({
    queryKey: ['public', 'news', page, type],
    queryFn: () => communityApi.news({ page, limit: 9, type: type || undefined }),
  });
  return (
    <div className="public-container">
      <PageHeading title="Tin tức và thông báo" />
      <select
        aria-label="Loại tin"
        value={type}
        onChange={(e) => {
          setType(e.target.value);
          setPage(1);
        }}
      >
        <option value="">Tất cả loại tin</option>
        {['News', 'Announcement', 'Update'].map((t) => (
          <option value={t} key={t}>
            {t}
          </option>
        ))}
      </select>
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
        <div className="spaced">
          <NewsCards items={query.data.data} />
          <Pagination
            label="bài viết"
            page={page}
            limit={9}
            total={query.data.pagination?.total || 0}
            onChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
export function PublicArticle() {
  const { slug = '' } = useParams();
  const query = useQuery({
    queryKey: ['public', 'article', slug],
    queryFn: () => communityApi.article(slug),
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
  const a = query.data;
  return (
    <article className="public-container article-body">
      <PageHeading title={a.title} description={formatDate(a.publishedAt, true)} />
      {a.imageUrl && <img className="article-cover" src={a.imageUrl} alt="" />}
      {a.videoUrl && safeDocumentUrl(a.videoUrl) && (
        <video className="article-cover" controls preload="metadata" src={a.videoUrl} />
      )}
      <p className="muted prose">{a.summary}</p>
      <div className="panel prose" dangerouslySetInnerHTML={{ __html: cleanHtml(a.body || '') }} />
    </article>
  );
}
export function PublicGames() {
  const query = useQuery({ queryKey: ['games'], queryFn: managementApi.games });
  return (
    <div className="public-container">
      <PageHeading title="Các bộ môn thi đấu" />
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
        <div className="public-cards">
          {query.data.map((g) => (
            <Link className="panel" key={g._id} to={`/tournaments?gameId=${g._id}`}>
              <Avatar large fit="contain" name={g.name} url={g.logoUrl} />
              <h2>{g.name}</h2>
              <p className="muted">{g.description || g.publisher}</p>
              <span>Xem giải đấu →</span>
            </Link>
          ))}
          {!query.data.length && <Empty />}
        </div>
      )}
    </div>
  );
}
export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q')?.trim() || '';
  const query = useQuery({
    queryKey: ['public', 'search', q],
    queryFn: async () => {
      const [tournaments, clubs, news] = await Promise.all([
        communityApi.tournaments({ search: q, limit: 6 }),
        communityApi.clubs({ search: q, limit: 6 }),
        communityApi.news({ search: q, limit: 6 }),
      ]);
      return { tournaments: tournaments.data, clubs: clubs.data, news: news.data };
    },
    enabled: !!q,
  });
  return (
    <div className="public-container">
      <PageHeading
        title="Tìm kiếm"
        description={q ? `Kết quả cho “${q}”` : 'Nhập từ khóa trên thanh tìm kiếm để bắt đầu.'}
      />
      {q &&
        (query.isPending ? (
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
            <h2>Giải đấu</h2>
            <TournamentCards items={query.data.tournaments} />
            <h2 className="spaced">Câu lạc bộ</h2>
            <div className="public-cards">
              {query.data.clubs.map((c) => (
                <Link className="panel" key={c._id} to={`/clubs/${c._id}`}>
                  {c.name}
                </Link>
              ))}
              {!query.data.clubs.length && <Empty />}
            </div>
            <h2 className="spaced">Tin tức</h2>
            <NewsCards items={query.data.news} />
          </>
        ))}
    </div>
  );
}
