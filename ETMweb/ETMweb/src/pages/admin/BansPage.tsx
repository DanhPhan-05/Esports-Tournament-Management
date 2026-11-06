import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { managementApi, save } from '../../services/management';
import { adminApi, api } from '../../services/api';
import { Button, PageHeading, Pagination, QueryError, Spinner, Table } from '../../components/ui';
import { ConfirmAction, DataForm, Empty, Status } from '../../components/management';
import { banState, dateOrder, localDate } from '../../utils/management';
import { formatDate } from '../../utils/account';
import type { Ban } from '../../types/management';
export function BansPage() {
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Ban | 'new' | null>(null);
  const [revoke, setRevoke] = useState<Ban | null>(null);
  const [email, setEmail] = useState('');
  const accounts = useQuery({
    queryKey: ['admin', 'ban-account-options', email],
    queryFn: () => adminApi.accounts({ email, limit: 100 }),
    enabled: edit === 'new',
  });
  const clubs = useQuery({ queryKey: ['admin', 'clubs'], queryFn: managementApi.adminClubs });
  const query = useQuery({
    queryKey: ['admin', 'bans'],
    queryFn: async () => {
      const first = await managementApi.bans({ limit: 100 });
      const pages = Math.ceil((first.pagination?.total || 0) / 100);
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
          managementApi.bans({ page: i + 2, limit: 100 }),
        ),
      );
      return [...first.data, ...rest.flatMap((p) => p.data)];
    },
  });
  const filtered = query.data?.filter((b) => !state || banState(b) === state) || [];
  const fieldOptions = ['System', 'Competition'].map((v) => ({ value: v, label: v }));
  return (
    <>
      <PageHeading
        title="Danh sách lệnh cấm"
        description="Quản lý lệnh cấm tài khoản, CLB và cá nhân theo thời gian hiệu lực."
        action={<Button onClick={() => setEdit('new')}>Tạo lệnh cấm</Button>}
      />
      <div className="filters">
        <select
          aria-label="Lọc lệnh cấm"
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả lệnh cấm</option>
          {['Active', 'Expired', 'Revoked', 'Scheduled'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
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
        <section className="panel table-panel">
          <Table>
            <thead>
              <tr>
                <th>Đối tượng</th>
                <th>Lý do</th>
                <th>Phạm vi</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice((page - 1) * 10, page * 10).map((b) => (
                <tr key={b._id}>
                  <td>
                    {b.targetType}
                    <small className="block muted">
                      {b.clubId
                        ? clubs.data?.find((c) => c._id === b.clubId)?.name || b.clubId
                        : b.accountId || 'Cá nhân · CCCD đã được bảo vệ'}
                    </small>
                  </td>
                  <td className="wrap-cell">{b.reason}</td>
                  <td>{b.scope}</td>
                  <td>{formatDate(b.startsAt, true)}</td>
                  <td>{b.endsAt ? formatDate(b.endsAt, true) : 'Không thời hạn'}</td>
                  <td>
                    <Status value={banState(b)} />
                  </td>
                  <td>
                    {['Active', 'Scheduled'].includes(banState(b)) && (
                      <>
                        <Button variant="ghost" onClick={() => setEdit(b)}>
                          Chỉnh sửa
                        </Button>
                        <Button variant="ghost" onClick={() => setRevoke(b)}>
                          Gỡ cấm
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!filtered.length && <Empty />}
          <Pagination label="lệnh cấm" page={page} total={filtered.length} limit={10} onChange={setPage} />
        </section>
      )}
      {edit && (
        <DataForm
          title={edit === 'new' ? 'Tạo lệnh cấm' : 'Chỉnh sửa lệnh cấm'}
          onClose={() => setEdit(null)}
          defaults={
            edit === 'new'
              ? { targetType: 'Account', scope: 'System', startsAt: localDate(new Date().toISOString()) }
              : { ...edit, startsAt: localDate(edit.startsAt), endsAt: localDate(edit.endsAt) }
          }
          fields={[
            ...(edit === 'new'
              ? [
                  {
                    name: 'targetType',
                    label: 'Loại đối tượng',
                    options: ['Account', 'Club', 'Individual'].map((v) => ({ value: v, label: v })),
                  },
                  { name: 'startsAt', label: 'Bắt đầu hiệu lực', required: true, type: 'datetime-local' },
                ]
              : []),
            { name: 'reason', label: 'Lý do', required: true, type: 'textarea' },
            { name: 'scope', label: 'Phạm vi', options: fieldOptions },
            { name: 'endsAt', label: 'Ngày kết thúc (bỏ trống: không thời hạn)', type: 'datetime-local' },
          ]}
          submit={async (v) => {
            if (
              v.endsAt &&
              (!dateOrder([v.startsAt, v.endsAt]) || Date.parse(v.endsAt) === Date.parse(v.startsAt))
            )
              throw new Error('Ngày kết thúc phải sau ngày bắt đầu.');
            const body: Record<string, unknown> = {
              reason: v.reason.trim(),
              scope: v.scope,
              endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null,
            };
            if (edit === 'new') {
              body.targetType = v.targetType;
              body.startsAt = new Date(v.startsAt).toISOString();
              if (v.targetType === 'Individual') {
                if (!/^\d{12}$/.test(v.citizenId || '')) throw new Error('CCCD cần đúng 12 chữ số.');
                body.citizenId = v.citizenId;
              } else if (v.targetType === 'Account') {
                if (!v.accountId) throw new Error('Chọn tài khoản bị cấm.');
                body.accountId = v.accountId;
              } else {
                if (!v.clubId) throw new Error('Chọn CLB bị cấm.');
                body.clubId = v.clubId;
              }
            }
            await save(
              `/admin/bans${edit === 'new' ? '' : `/${edit._id}`}`,
              body,
              edit === 'new' ? 'post' : 'put',
            );
          }}
        >
          {(form) =>
            edit === 'new' ? (
              <>
                {form.watch('targetType') === 'Individual' ? (
                  <div className="field" key="individual-target">
                    <label htmlFor="ban-citizen">CCCD (12 chữ số)</label>
                    <input id="ban-citizen" {...form.register('citizenId')} />
                  </div>
                ) : form.watch('targetType') === 'Club' ? (
                  <div className="field" key="club-target">
                    <label htmlFor="ban-club">CLB bị cấm</label>
                    <select id="ban-club" {...form.register('clubId')}>
                      <option value="">Chọn CLB</option>
                      {clubs.data?.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="field">
                      <label htmlFor="ban-account-search">Tìm email tài khoản</label>
                      <input
                        id="ban-account-search"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="ban-account">Tài khoản bị cấm</label>
                      <select id="ban-account" {...form.register('accountId')}>
                        <option value="">Chọn tài khoản</option>
                        {accounts.data?.data.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.fullName} · {a.email}
                          </option>
                        ))}
                      </select>
                      {accounts.isError && <p role="alert">{accounts.error.message}</p>}
                    </div>
                  </>
                )}
              </>
            ) : null
          }
        </DataForm>
      )}
      {revoke && (
        <ConfirmAction
          title="Gỡ lệnh cấm?"
          description="Lệnh cấm được ghi nhận là đã gỡ, lịch sử vẫn được giữ."
          onClose={() => setRevoke(null)}
          action={() => api.delete(`/admin/bans/${revoke._id}`)}
        />
      )}
    </>
  );
}
