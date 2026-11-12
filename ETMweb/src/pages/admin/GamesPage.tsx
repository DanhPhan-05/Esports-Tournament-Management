import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { managementApi, save } from '../../services/management';
import { Avatar, Button, PageHeading, QueryError, Spinner, Table } from '../../components/ui';
import { ConfirmAction, DataForm, Empty, ImageUpload, Status } from '../../components/management';
import type { Game } from '../../types/management';
export function AdminGamesPage() {
  const query = useQuery({ queryKey: ['admin', 'games'], queryFn: managementApi.adminGames });
  const [edit, setEdit] = useState<Game | 'new' | null>(null);
  const [toggle, setToggle] = useState<Game | null>(null);
  return (
    <>
      <PageHeading
        title="Danh mục game"
        description="Game là dữ liệu tham chiếu; ngừng hỗ trợ không xóa lịch sử team và giải đấu."
        action={<Button onClick={() => setEdit('new')}>Thêm game</Button>}
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
                <th>Game</th>
                <th>Team tham chiếu</th>
                <th>Giải đấu tham chiếu</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((g) => (
                <tr key={g._id}>
                  <td>
                    <span className="account-cell">
                      <Avatar name={g.name} url={g.logoUrl} />
                      {g.name}
                    </span>
                  </td>
                  <td>{g.teamCount}</td>
                  <td>{g.tournamentCount}</td>
                  <td>
                    <Status value={g.isActive ? 'Active' : 'Inactive'} />
                  </td>
                  <td>
                    <Button variant="ghost" onClick={() => setEdit(g)}>
                      Chỉnh sửa
                    </Button>
                    <Button variant="ghost" onClick={() => setToggle(g)}>
                      {g.isActive ? 'Ngừng hỗ trợ' : 'Kích hoạt'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!query.data.length && <Empty />}
        </section>
      )}
      {edit && (
        <DataForm
          title={edit === 'new' ? 'Thêm game' : 'Chỉnh sửa game'}
          onClose={() => setEdit(null)}
          defaults={edit === 'new' ? { isActive: true } : edit}
          fields={[
            { name: 'name', label: 'Tên game', required: true },
            { name: 'slug', label: 'Slug', required: true },
            { name: 'publisher', label: 'Nhà phát hành' },
            { name: 'description', label: 'Mô tả', type: 'textarea' },
          ]}
          submit={async (v) => {
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug))
              throw new Error('Slug chỉ dùng chữ thường, số và dấu gạch ngang.');
            await save(
              `/admin/games${edit === 'new' ? '' : `/${edit._id}`}`,
              v,
              edit === 'new' ? 'post' : 'put',
            );
          }}
        >
          {(form) => (
            <ImageUpload
              scope="game"
              entityId={edit !== 'new' ? edit?._id : undefined}
              assetName={form.watch('slug') || form.watch('name')}
              value={form.watch('logoUrl')}
              onChange={(url) => form.setValue('logoUrl', url)}
              onBusy={(busy) => form.setValue('_uploading', busy)}
            />
          )}
        </DataForm>
      )}
      {toggle && (
        <ConfirmAction
          title={toggle.isActive ? 'Ngừng hỗ trợ game?' : 'Kích hoạt game?'}
          description="Các tham chiếu và dữ liệu lịch sử được giữ nguyên."
          onClose={() => setToggle(null)}
          action={() => save(`/admin/games/${toggle._id}`, { isActive: !toggle.isActive }, 'put')}
        />
      )}
    </>
  );
}
