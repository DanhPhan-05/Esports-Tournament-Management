import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { communityApi } from '../../services/community';
import { save } from '../../services/management';
import { Button, PageHeading, Pagination, QueryError, Spinner, Table } from '../../components/ui';
import { DataForm, Empty, Status } from '../../components/management';
import { DocumentLinks } from '../../components/DocumentUpload';
import { formatDate } from '../../utils/account';
import type { Violation } from '../../types/community';
function ReportMatch({ report }: { report: Violation }) {
  const match = typeof report.targetId === 'object' ? report.targetId : null;
  return match ? (
    <>
      <Link to={`/matches/${match._id}`}>
        {match.teamAId?.name || 'Chưa xác định'} — {match.teamBId?.name || 'Chưa xác định'}
      </Link>
      <small className="block muted">
        {match.tournamentId?.name || 'Giải đấu'} · Vòng {match.round} · Trận {match.position}
      </small>
    </>
  ) : (
    <span>Trận đấu không còn tồn tại</span>
  );
}
export function ViolationReportsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [target, setTarget] = useState('');
  const [edit, setEdit] = useState<Violation | null>(null);
  const query = useQuery({
    queryKey: ['admin', 'reports', page, status, target],
    queryFn: () =>
      communityApi.reports({ page, limit: 10, status: status || undefined, category: target || undefined }),
  });
  return (
    <>
      <PageHeading title="Báo cáo trận đấu" />
      <div className="filters">
        <select
          aria-label="Trạng thái báo cáo"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Mọi trạng thái</option>
          {['Submitted', 'UnderReview', 'Resolved', 'Rejected'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          aria-label="Loại báo cáo"
          value={target}
          onChange={(e) => {
            setTarget(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Mọi loại báo cáo</option>
          {['Kết quả trận đấu', 'Vi phạm luật thi đấu'].map((s) => (
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
                <th>Người báo cáo</th>
                <th>Giải đấu / Trận đấu</th>
                <th>Loại vi phạm</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((r) => (
                <tr key={r._id}>
                  <td>{r.reporterId?.fullName || '—'}</td>
                  <td>
                    <ReportMatch report={r} />
                  </td>
                  <td>{r.category}</td>
                  <td>
                    <Status value={r.status} />
                  </td>
                  <td>
                    <Button variant="ghost" onClick={() => setEdit(r)}>
                      Xem / Xử lý
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!query.data.data.length && <Empty />}
          <Pagination
            label="báo cáo"
            page={page}
            limit={10}
            total={query.data.pagination?.total || 0}
            onChange={setPage}
          />
        </section>
      )}
      {edit && (
        <DataForm
          title="Xử lý báo cáo"
          defaults={{
            status: edit.status === 'Submitted' ? 'UnderReview' : edit.status,
            resolution: edit.resolution || '',
          }}
          onClose={() => setEdit(null)}
          fields={
            ['Resolved', 'Rejected'].includes(edit.status)
              ? []
              : [
                  {
                    name: 'status',
                    label: 'Trạng thái xử lý',
                    options: ['UnderReview', 'Resolved', 'Rejected'].map((v) => ({ value: v, label: v })),
                  },
                  { name: 'resolution', label: 'Giải thích xử lý', type: 'textarea' },
                ]
          }
          submit={async (v) => {
            if (['Resolved', 'Rejected'].includes(edit.status)) return;
            if (['Resolved', 'Rejected'].includes(v.status) && !v.resolution?.trim())
              throw new Error('Cần giải thích khi kết thúc hoặc từ chối báo cáo.');
            await save(`/admin/reports/${edit._id}`, v, 'put');
          }}
        >
          {() => (
            <>
              <p className="muted small">
                <ReportMatch report={edit} />
              </p>
              <p className="prose">{edit.description}</p>
              <DocumentLinks urls={edit.evidenceUrls} />
              {edit.resolution && <p className="prose">Kết quả: {edit.resolution}</p>}
            </>
          )}
        </DataForm>
      )}
    </>
  );
}
export function OwnReportPage() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['own-report', id], queryFn: () => communityApi.ownReport(id) });
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
  const r = query.data;
  return (
    <>
      <PageHeading title={`Báo cáo · ${r.category}`} description={formatDate(r.createdAt, true)} />
      <section className="panel">
        <ReportMatch report={r} />
        <Status value={r.status} />
        <p className="prose">{r.description}</p>
        <DocumentLinks urls={r.evidenceUrls} />
        <h2>Kết quả xử lý</h2>
        <p className="prose">{r.resolution || 'Báo cáo đang chờ được xử lý.'}</p>
      </section>
    </>
  );
}
