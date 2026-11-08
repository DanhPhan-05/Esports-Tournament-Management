import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, api } from '../../services/api';
import { managementApi, save } from '../../services/management';
import { Avatar, Button, PageHeading, QueryError, Spinner, Table } from '../../components/ui';
import { ConfirmAction, DataForm, Empty, ImageUpload, Status } from '../../components/management';
import type { Club } from '../../types/management';
export function AdminClubsPage() {
  const created = useRef('');
  const query = useQuery({ queryKey: ['admin', 'clubs'], queryFn: managementApi.adminClubs });
  const [search, setSearch] = useState('');
  const [verified, setVerified] = useState('');
  const [edit, setEdit] = useState<Club | 'new' | null>(null);
  const [remove, setRemove] = useState<Club | null>(null);
  const [email, setEmail] = useState('');
  const managers = useQuery({
    queryKey: ['admin', 'manager-options', email],
    queryFn: () => adminApi.accounts({ role: 'ClubManager', status: 'Active', email, limit: 100 }),
  });
  return (
    <>
      <PageHeading
        title="Quản lý câu lạc bộ"
        action={
          <Button
            onClick={() => {
              created.current = '';
              setEdit('new');
            }}
          >
            Tạo CLB
          </Button>
        }
      />
      <div className="filters">
        <input
          aria-label="Tìm CLB"
          placeholder="Tìm tên CLB…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Lọc xác minh" value={verified} onChange={(e) => setVerified(e.target.value)}>
          <option value="">Mọi trạng thái xác minh</option>
          <option value="yes">Đã xác minh</option>
          <option value="no">Chưa xác minh</option>
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
        <section className="panel table-panel">
          <Table>
            <thead>
              <tr>
                <th>CLB</th>
                <th>Xác minh</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {query.data
                .filter(
                  (c) =>
                    c.name.toLowerCase().includes(search.toLowerCase()) &&
                    (!verified || c.isVerified === (verified === 'yes')),
                )
                .map((c) => (
                  <tr key={c._id}>
                    <td>
                      <span className="account-cell">
                        <Avatar name={c.name} url={c.logoUrl} />
                        {c.name}
                      </span>
                    </td>
                    <td>{c.isVerified ? '✓ Đã xác minh' : 'Chưa xác minh'}</td>
                    <td>
                      <Status value={c.status} />
                    </td>
                    <td>
                      <Button variant="ghost" onClick={() => setEdit(c)}>
                        Xác minh / Gán quản lý
                      </Button>
                      {c.status !== 'Inactive' && (
                        <Button variant="ghost" onClick={() => setRemove(c)}>
                          Vô hiệu hóa
                        </Button>
                      )}
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
          title={edit === 'new' ? 'Tạo câu lạc bộ' : 'Xác minh / Gán quản lý CLB'}
          defaults={edit === 'new' ? {} : edit}
          onClose={() => setEdit(null)}
          fields={[
            { name: 'name', label: 'Tên CLB', required: true },
            ...(edit === 'new'
              ? [
                  { name: 'shortName', label: 'Tên viết tắt', required: true },
                  { name: 'contactEmail', label: 'Email liên hệ', required: true, type: 'email' },
                ]
              : [
                  {
                    name: 'status',
                    label: 'Trạng thái',
                    options: ['Active', 'Inactive', 'Suspended'].map((v) => ({ value: v, label: v })),
                  },
                ]),
          ]}
          submit={async (v) => {
            const managerAccountId = v.managerAccountId || undefined;
            if (edit === 'new') {
              if (v.shortName.length > 12) throw new Error('Tên viết tắt tối đa 12 ký tự.');
              if (!created.current) {
                const response = await save<Club>('/admin/clubs', v);
                created.current = response.data._id;
              }
              await save(
                `/admin/clubs/${created.current}`,
                { managerAccountId, isVerified: !!v.isVerified, logoUrl: v.logoUrl },
                'put',
              );
            } else
              await save(
                `/admin/clubs/${edit._id}`,
                {
                  name: v.name,
                  status: v.status,
                  isVerified: !!v.isVerified,
                  managerAccountId,
                  logoUrl: v.logoUrl,
                },
                'put',
              );
          }}
        >
          {(form) => (
            <>
              <ImageUpload
                scope="club-logo"
                entityId={edit !== 'new' ? edit?._id : undefined}
                assetName={form.watch('shortName') || form.watch('name')}
                value={form.watch('logoUrl')}
                onChange={(url) => form.setValue('logoUrl', url)}
                onBusy={(busy) => form.setValue('_uploading', busy)}
              />
              <label className="checkbox-row">
                <input type="checkbox" {...form.register('isVerified')} />
                Đã xác minh
              </label>
              <div className="field">
                <label htmlFor="find-manager">Tìm quản lý theo email</label>
                <input id="find-manager" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {managers.isError ? (
                <p role="alert">{managers.error.message}</p>
              ) : (
                <div className="field">
                  <label htmlFor="assign-manager">Club Manager mới</label>
                  <select id="assign-manager" {...form.register('managerAccountId')}>
                    <option value="">{edit === 'new' ? 'Chưa gán' : 'Giữ nguyên quản lý hiện tại'}</option>
                    {managers.data?.data.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.fullName} · {a.email}
                      </option>
                    ))}
                  </select>
                  <small className="muted">
                    Chỉ chọn tài khoản ClubManager đang hoạt động. Gán mới sẽ thay thế danh sách quản lý hiện
                    tại.
                  </small>
                </div>
              )}
            </>
          )}
        </DataForm>
      )}
      {remove && (
        <ConfirmAction
          title="Vô hiệu hóa CLB?"
          description="Lịch sử và thành viên được giữ nguyên."
          onClose={() => setRemove(null)}
          action={() => api.delete(`/admin/clubs/${remove._id}`)}
        />
      )}
    </>
  );
}
