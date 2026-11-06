import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { communityApi } from '../../services/community';
import { save } from '../../services/management';
import { Alert, Button, PageHeading, QueryError, Spinner, Table } from '../../components/ui';
import { DataForm } from '../../components/management';
import { policyError, policyFields, policyPreview } from '../../utils/policies';
export function SecurityPage() {
  const [tab, setTab] = useState('Password');
  const [edit, setEdit] = useState(false);
  const query = useQuery({ queryKey: ['admin', 'security'], queryFn: communityApi.policies });
  return (
    <>
      <PageHeading title="Chính sách bảo mật" />
      <div className="tabs" role="tablist" aria-label="Chính sách bảo mật">
        {[
          ['Password', 'Mật khẩu'],
          ['Login', 'Đăng nhập'],
          ['Session', 'Phiên'],
          ['RateLimit', 'Giới hạn yêu cầu'],
        ].map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
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
          <section className="panel">
            <h2>Cấu hình đang áp dụng</h2>
            <dl className="detail-facts">
              {policyFields[tab].map((f) => (
                <div className="fact-pair" key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>{query.data.current[tab][f.key]}</dd>
                </div>
              ))}
            </dl>
            <Alert kind="info">{policyPreview(tab, query.data.current[tab])}</Alert>
            <Button onClick={() => setEdit(true)}>Chỉnh sửa chính sách</Button>
          </section>
          <section className="panel spaced">
            <h2>Lịch sử phiên bản</h2>
            <Table>
              <thead>
                <tr>
                  <th>Phiên bản</th>
                  <th>Lý do thay đổi</th>
                </tr>
              </thead>
              <tbody>
                {query.data.history
                  .filter((h) => h.category === tab)
                  .map((h) => (
                    <tr key={h._id}>
                      <td>{h.version}</td>
                      <td>{h.changeReason}</td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </section>
          {edit && (
            <DataForm
              title="Chỉnh sửa chính sách"
              defaults={query.data.current[tab]}
              fields={[
                ...policyFields[tab].map((f) => ({
                  name: f.key,
                  label: f.label,
                  type: 'number',
                  required: true,
                })),
                {
                  name: 'changeReason',
                  label: 'Lý do thay đổi chính sách',
                  type: 'textarea',
                  required: true,
                },
              ]}
              onClose={() => setEdit(false)}
              submit={async (v) => {
                const config = Object.fromEntries(policyFields[tab].map((f) => [f.key, Number(v[f.key])]));
                const error = policyError(tab, config);
                if (error) throw new Error(error);
                await save(
                  `/admin/security-policies/${tab}`,
                  { config, changeReason: v.changeReason },
                  'put',
                );
              }}
            >
              {(form) => (
                <Alert kind="info">
                  {policyPreview(
                    tab,
                    Object.fromEntries(policyFields[tab].map((f) => [f.key, Number(form.watch(f.key))])),
                  )}
                </Alert>
              )}
            </DataForm>
          )}
        </>
      )}
    </>
  );
}
