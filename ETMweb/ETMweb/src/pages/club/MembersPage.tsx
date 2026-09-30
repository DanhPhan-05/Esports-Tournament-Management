import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useClub } from './ClubScope';
import { managementApi, save } from '../../services/management';
import { api } from '../../services/api';
import { Button, PageHeading, Pagination, QueryError, Spinner, Table } from '../../components/ui';
import { DataForm, Empty, Status } from '../../components/management';
import { gameName, refId, type Member } from '../../types/management';
import { formatDate } from '../../utils/account';
import { localDate, dateOrder } from '../../utils/management';
export function MembersPage() {
  const club = useClub();
  const [page, setPage] = useState(1);
  const [team, setTeam] = useState('');
  const [edit, setEdit] = useState<Member | 'new' | null>(null);
  const [ending, setEnding] = useState<Member | null>(null);
  const teams = useQuery({
    queryKey: ['cm', club._id, 'teams'],
    queryFn: () => managementApi.teams(club._id),
  });
  const teamGroups = [...new Set((teams.data || []).map((t) => gameName(t.gameId)))].sort();
  const query = useQuery({
    queryKey: ['cm', club._id, 'members', page, team],
    queryFn: () => managementApi.members(club._id, { page, limit: 10, teamId: team || undefined }),
  });
  return (
    <>
      <PageHeading
        title="Thành viên câu lạc bộ"
        description="Thành viên không cần có tài khoản ETM. Thời gian hoạt động được quản lý theo từng CLB."
        action={<Button onClick={() => setEdit('new')}>Thêm thành viên</Button>}
      />
      <section className="panel table-panel">
        <div className="filters member-team-filter">
          <label htmlFor="member-team">Lọc team</label>
          <select
            id="member-team"
            value={team}
            onChange={(e) => {
              setTeam(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả team</option>
            {teamGroups.map((game) => (
              <optgroup key={game} label={game}>
                {teams.data
                  ?.filter((t) => gameName(t.gameId) === game)
                  .map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} — {game}
                    </option>
                  ))}
              </optgroup>
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
          <>
            <Table>
              <thead>
                <tr>
                  {[
                    'Thành viên',
                    'CCCD',
                    'Team / Game / Vai trò',
                    'Bắt đầu',
                    'Kết thúc',
                    'Trạng thái',
                    'Thao tác',
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((m) => (
                  <tr key={m._id}>
                    <td>
                      {m.fullName}
                      <small className="block muted">{m.inGameName}</small>
                    </td>
                    <td>{`********${m.citizenIdLast4}`}</td>
                    <td>
                      {typeof m.teamId === 'object' ? m.teamId?.name : 'Chưa phân team'}
                      {m.teamId &&
                        (() => {
                          const assigned = teams.data?.find((t) => t._id === refId(m.teamId));
                          return assigned ? (
                            <small className="block muted">{gameName(assigned.gameId)}</small>
                          ) : null;
                        })()}
                      <small className="block muted">{m.teamRole}</small>
                    </td>
                    <td>{formatDate(m.activeFrom)}</td>
                    <td>{m.activeUntil ? formatDate(m.activeUntil) : 'Chưa xác định'}</td>
                    <td>
                      <Status value={m.status} />
                    </td>
                    <td>
                      <Button variant="ghost" onClick={() => setEdit(m)}>
                        Sửa / Phân team
                      </Button>
                      {m.status === 'Active' && (
                        <Button variant="ghost" onClick={() => setEnding(m)}>
                          Kết thúc
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!query.data.data.length && <Empty />}
            <Pagination
              page={page}
              total={query.data.pagination?.total || 0}
              limit={10}
              label="thành viên"
              onChange={setPage}
            />
          </>
        )}
      </section>
      {edit && (
        <DataForm
          title={edit === 'new' ? 'Thêm thành viên' : 'Chỉnh sửa thành viên'}
          onClose={() => setEdit(null)}
          defaults={
            edit === 'new'
              ? { teamRole: 'Player', activeFrom: localDate(new Date().toISOString()), teamId: '' }
              : {
                  ...edit,
                  teamId: refId(edit.teamId),
                  activeFrom: localDate(edit.activeFrom),
                  activeUntil: localDate(edit.activeUntil),
                }
          }
          fields={[
            ...(edit === 'new' ? [{ name: 'citizenId', label: 'CCCD (12 chữ số)', required: true }] : []),
            { name: 'fullName', label: 'Họ và tên', required: true },
            { name: 'activeFrom', label: 'Bắt đầu hoạt động', type: 'datetime-local', required: true },
            { name: 'activeUntil', label: 'Kết thúc hoạt động', type: 'datetime-local' },
            {
              name: 'teamId',
              label: 'Phân vào team',
              options: [
                { value: '', label: 'Chưa phân team' },
                ...(teams.data || [])
                  .filter(
                    (t) =>
                      t.status === 'Active' &&
                      (edit === 'new' || !edit.gameId || refId(t.gameId) === edit.gameId),
                  )
                  .map((t) => ({
                    value: t._id,
                    label: `${t.name} — ${gameName(t.gameId)}`,
                    group: gameName(t.gameId),
                  })),
              ],
            },
            { name: 'inGameName', label: 'Tên trong game' },
            {
              name: 'teamRole',
              label: 'Vai trò',
              options: ['Player', 'Captain', 'Substitute'].map((v) => ({ value: v, label: v })),
            },
          ]}
          submit={async (v) => {
            if (edit === 'new' && !/^\d{12}$/.test(v.citizenId)) throw new Error('CCCD cần đúng 12 chữ số.');
            if (v.activeUntil && !dateOrder([v.activeFrom, v.activeUntil]))
              throw new Error('Kết thúc phải sau hoặc bằng thời gian bắt đầu.');
            const result = await save(
              `/clubs/${club._id}/members${edit === 'new' ? '' : `/${edit._id}`}`,
              {
                ...v,
                teamId: v.teamId || null,
                activeFrom: new Date(v.activeFrom).toISOString(),
                activeUntil: v.activeUntil ? new Date(v.activeUntil).toISOString() : null,
              },
              edit === 'new' ? 'post' : 'put',
            );
            return result.warning
              ? `Cảnh báo trùng thời gian hoạt động giữa các CLB: ${result.warning}`
              : undefined;
          }}
        />
      )}
      {ending && (
        <DataForm
          title="Kết thúc hoạt động"
          onClose={() => setEnding(null)}
          defaults={{ activeUntil: localDate(new Date().toISOString()) }}
          fields={[
            { name: 'activeUntil', label: 'Thời gian kết thúc', required: true, type: 'datetime-local' },
          ]}
          submit={async (v) => {
            if (!dateOrder([ending.activeFrom, v.activeUntil]))
              throw new Error('Kết thúc không được trước thời gian bắt đầu.');
            await api.delete(`/clubs/${club._id}/members/${ending._id}`, {
              data: { activeUntil: new Date(v.activeUntil).toISOString() },
            });
          }}
        />
      )}
    </>
  );
}
