import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useClub } from './ClubScope';
import { managementApi, save } from '../../services/management';
import { api } from '../../services/api';
import { Avatar, Button, PageHeading, Pagination, QueryError, Spinner, Table } from '../../components/ui';
import { ConfirmAction, DataForm, Empty, ImageUpload, Status } from '../../components/management';
import { gameName, refId, type Team } from '../../types/management';
export function TeamsPage() {
  const club = useClub();
  const [edit, setEdit] = useState<Team | 'new' | null>(null);
  const [remove, setRemove] = useState<Team | null>(null);
  const [view, setView] = useState('');
  const [page, setPage] = useState(1);
  const games = useQuery({ queryKey: ['games'], queryFn: managementApi.games });
  const teams = useQuery({
    queryKey: ['cm', club._id, 'teams'],
    queryFn: () => managementApi.teams(club._id),
  });
  const members = useQuery({
    queryKey: ['cm', club._id, 'team-members', view, page],
    queryFn: () => managementApi.members(club._id, { teamId: view, page, limit: 10 }),
    enabled: !!view,
  });
  return (
    <>
      <PageHeading
        title="Đội tuyển"
        description="Mỗi team gắn với một game. Game của team được giữ cố định."
        action={<Button onClick={() => setEdit('new')}>Thêm team</Button>}
      />
      {games.isError && (
        <QueryError
          message={games.error.message}
          retry={() => {
            void games.refetch();
          }}
        />
      )}
      {teams.isPending ? (
        <Spinner />
      ) : teams.isError ? (
        <QueryError
          message={teams.error.message}
          retry={() => {
            void teams.refetch();
          }}
        />
      ) : (
        <section className="panel table-panel">
          <Table>
            <thead>
              <tr>
                <th>Team</th>
                <th>Game</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {teams.data.map((t) => (
                <tr key={t._id}>
                  <td>
                    <Avatar name={t.name} url={t.logoUrl} /> {t.name}
                    <small className="block muted">{t.tag}</small>
                  </td>
                  <td>{gameName(t.gameId)}</td>
                  <td>
                    <Status value={t.status} />
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setView(t._id);
                        setPage(1);
                      }}
                    >
                      Thành viên
                    </Button>
                    <Button variant="ghost" onClick={() => setEdit(t)}>
                      Sửa
                    </Button>
                    {t.status === 'Active' && (
                      <Button variant="ghost" onClick={() => setRemove(t)}>
                        Ngừng hoạt động
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!teams.data.length && <Empty />}
        </section>
      )}
      {view && (
        <section className="panel spaced">
          <h2>Thành viên · {teams.data?.find((t) => t._id === view)?.name}</h2>
          {members.isPending ? (
            <Spinner />
          ) : members.isError ? (
            <QueryError
              message={members.error.message}
              retry={() => {
                void members.refetch();
              }}
            />
          ) : (
            <>
              <ul>
                {members.data.data.map((m) => (
                  <li key={m._id}>
                    {m.fullName} · {m.inGameName || 'Chưa có tên game'} · {m.teamRole}
                  </li>
                ))}
              </ul>
              {!members.data.data.length && <Empty />}
              <Pagination
                label="thành viên"
                page={page}
                limit={10}
                total={members.data.pagination?.total || 0}
                onChange={setPage}
              />
            </>
          )}
        </section>
      )}
      {edit && (
        <DataForm
          title={edit === 'new' ? 'Thêm team' : 'Sửa team'}
          onClose={() => setEdit(null)}
          defaults={edit === 'new' ? {} : { ...edit, gameId: refId(edit.gameId) }}
          fields={[
            { name: 'name', label: 'Tên team', required: true },
            { name: 'tag', label: 'Tên viết tắt', required: true },
            {
              name: 'gameId',
              label: 'Game',
              disabled: edit !== 'new',
              required: edit === 'new',
              options: [
                { value: '', label: 'Chọn game' },
                ...(games.data || []).map((g) => ({ value: g._id, label: g.name })),
              ],
            },
          ]}
          submit={async (v) => {
            if (String(v.tag).length > 12) throw new Error('Tên viết tắt tối đa 12 ký tự.');
            await save(
              edit === 'new' ? `/clubs/${club._id}/teams` : `/teams/${edit._id}`,
              {
                name: v.name,
                tag: v.tag,
                logoUrl: v.logoUrl,
                ...(edit === 'new' ? { gameId: v.gameId } : {}),
              },
              edit === 'new' ? 'post' : 'put',
            );
          }}
        >
          {(form) => (
            <ImageUpload
              scope="team"
              clubId={club._id}
              entityId={edit !== 'new' ? edit?._id : undefined}
              assetName={form.watch('tag') || form.watch('name')}
              value={form.watch('logoUrl')}
              onChange={(url) => form.setValue('logoUrl', url)}
              onBusy={(busy) => form.setValue('_uploading', busy)}
            />
          )}
        </DataForm>
      )}
      {remove && (
        <ConfirmAction
          title="Ngừng hoạt động team?"
          description="Các thành viên sẽ được bỏ phân công khỏi team. Thời gian hoạt động tại CLB vẫn được giữ."
          action={() => api.delete(`/teams/${remove._id}`)}
          onClose={() => {
            setRemove(null);
            setView('');
          }}
        />
      )}
    </>
  );
}
