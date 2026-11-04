import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { competitionApi } from '../../services/competition';
import { managementApi, save } from '../../services/management';
import { Alert, Button, PageHeading, QueryError, Spinner } from '../../components/ui';
import { ConfirmAction, Status } from '../../components/management';
import { refId, type Team } from '../../types/management';
import type { BracketData } from '../../types/competition';
import { reorder } from '../../utils/competition';
import { ApiError } from '../../services/api';
export function BracketPage() {
  const { id = '' } = useParams();
  const [action, setAction] = useState('');
  const [order, setOrder] = useState<string[] | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ['bracket', id],
    queryFn: () => competitionApi.bracket(id),
    retry: false,
  });
  const apps = useQuery({
    queryKey: ['to', id, 'applications'],
    queryFn: () => managementApi.tournamentApplications(id),
  });
  const tournament = useQuery({
    queryKey: ['to', 'tournament', id],
    queryFn: () => managementApi.tournament(id),
  });
  if (apps.isPending || tournament.isPending || query.isPending) return <Spinner />;
  if (apps.isError || tournament.isError)
    return (
      <QueryError
        message={apps.error?.message || tournament.error?.message || 'Lỗi dữ liệu'}
        retry={() => {
          void apps.refetch();
          void tournament.refetch();
        }}
      />
    );
  if (query.isError && (!(query.error instanceof ApiError) || query.error.status !== 404))
    return (
      <QueryError
        message={query.error.message}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const data = query.data;
  const teams = apps.data.filter((a) => a.status === 'Approved' && a.teamId).map((a) => a.teamId!);
  const saved =
    data?.bracket.seeds
      .slice()
      .sort((a, b) => a.seed - b.seed)
      .map((s) => refId(s.teamId)) || [];
  const seeds = order || saved;
  const changed = order !== null && JSON.stringify(order) !== JSON.stringify(saved);
  const editable =
    data?.bracket.status === 'Draft' && !['Cancelled', 'Completed'].includes(tournament.data.status);
  const allApproved = teams.length >= 2;
  const name = (team: string) => teams.find((t) => t._id === team)?.name || team;
  return (
    <>
      <PageHeading
        title="Quản lý nhánh đấu"
        description={tournament.data.name}
        action={
          <Link className="button secondary" to={`/to/tournaments/${id}`}>
            Chi tiết giải
          </Link>
        }
      />
      {data ? (
        <>
          <Status value={data.bracket.status} />
          {editable && (
            <>
              <p className="muted spaced">
                Kéo thả thứ tự seed hoặc dùng nút lên/xuống. Việc lưu sẽ sinh lại cặp đấu của bản nháp và cần
                lý do.
              </p>
              <ol className="seed-list">
                {seeds.map((team, index) => (
                  <li
                    key={team}
                    draggable
                    onDragStart={(event) => {
                      setDrag(index);
                      event.dataTransfer.setData('text/plain', String(index));
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (drag !== null) setOrder(reorder(seeds, drag, index));
                      setDrag(null);
                    }}
                  >
                    <span>
                      #{index + 1} · {name(team)}
                    </span>
                    <div>
                      <Button
                        variant="ghost"
                        aria-label={`Đưa ${name(team)} lên`}
                        disabled={index === 0}
                        onClick={() => setOrder(reorder(seeds, index, index - 1))}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Đưa ${name(team)} xuống`}
                        disabled={index === seeds.length - 1}
                        onClick={() => setOrder(reorder(seeds, index, index + 1))}
                      >
                        ↓
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="form-actions">
                <Button variant="secondary" disabled={!changed} onClick={() => setOrder(null)}>
                  Bỏ thay đổi seed
                </Button>
                <Button disabled={!changed} onClick={() => setAction('reseed')}>
                  Lưu seed
                </Button>
                <Button disabled={changed} onClick={() => setAction('publish')}>
                  Công bố nhánh đấu
                </Button>
              </div>
              {changed && (
                <Alert kind="info">
                  Preview bên dưới là bản đã lưu. Lưu seed để tải cặp đấu mới trước khi công bố.
                </Alert>
              )}
            </>
          )}
          <BracketPreview data={data} teams={teams} />
        </>
      ) : (
        <section className="panel">
          <h2>Giải chưa có nhánh đấu</h2>
          <p className="prose">
            Cần ít nhất 2 team có hồ sơ và roster đã được duyệt, đồng thời đóng đăng ký trước khi sinh nhánh.
          </p>
          <Button
            disabled={
              !allApproved ||
              ['Draft', 'RegistrationOpen', 'Cancelled', 'Completed'].includes(tournament.data.status)
            }
            onClick={() => setAction('generate')}
          >
            Sinh nhánh đấu
          </Button>
        </section>
      )}
      {action && (
        <ConfirmAction
          title={
            action === 'generate'
              ? 'Sinh nhánh đấu?'
              : action === 'reseed'
                ? 'Lưu thứ tự seed?'
                : 'Công bố nhánh đấu?'
          }
          description={
            action === 'publish'
              ? 'Sau công bố, thứ tự seed sẽ không còn được sửa.'
              : 'Nhánh đấu được tạo theo thể thức của giải và các team đủ điều kiện.'
          }
          reason={action === 'reseed'}
          onClose={() => setAction('')}
          action={async (reason) => {
            if (action === 'generate') await save(`/tournaments/${id}/brackets`, {});
            else if (action === 'reseed') {
              await save(
                `/brackets/${data!.bracket._id}`,
                {
                  teamIds: seeds,
                  reason,
                  predictionEnabled: data!.bracket.predictionEnabled,
                  predictionOpenAt: data!.bracket.predictionOpenAt,
                  predictionLockAt: data!.bracket.predictionLockAt,
                },
                'put',
              );
              setOrder(null);
            } else await save(`/tournaments/${id}/brackets/publish`, {});
          }}
        />
      )}
    </>
  );
}
function BracketPreview({ data, teams }: { data: BracketData; teams: Team[] }) {
  const label = (team: Parameters<typeof refId>[0]) =>
    teams.find((t) => t._id === refId(team))?.name || 'TBD';
  const rounds = [...new Set(data.matches.map((m) => m.round))].sort((a, b) => a - b);
  return (
    <section className="panel spaced">
      <h2>Xem trước nhánh đấu</h2>
      <div className="bracket-readonly">
        {rounds.map((round) => (
          <div key={round}>
            <h3>Vòng {round}</h3>
            {data.matches
              .filter((m) => m.round === round)
              .map((m) => (
                <article className="panel" key={m._id}>
                  <small className="muted">
                    {m.section} · Trận {m.position}
                  </small>
                  <p>{label(m.teamAId)}</p>
                  <hr />
                  <p>{m.isBye ? 'BYE' : label(m.teamBId)}</p>
                  <Link to={`/to/matches/${m._id}`}>Chi tiết trận →</Link>
                </article>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}
