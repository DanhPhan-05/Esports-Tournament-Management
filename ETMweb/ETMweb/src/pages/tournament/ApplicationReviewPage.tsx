import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { managementApi } from '../../services/management';
import { PageHeading, QueryError, Spinner, Table } from '../../components/ui';
import { Empty, Status } from '../../components/management';
export function ApplicationReviewPage() {
  const { id = '' } = useParams();
  const [status, setStatus] = useState('');
  const query = useQuery({
    queryKey: ['to', id, 'applications'],
    queryFn: () => managementApi.tournamentApplications(id),
  });
  return (
    <>
      <PageHeading
        title="Duyệt hồ sơ đăng ký"
        action={
          <Link className="button secondary" to={`/to/tournaments/${id}`}>
            Chi tiết giải
          </Link>
        }
      />
      <div className="filters">
        <select aria-label="Lọc hồ sơ" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {['Draft', 'Submitted', 'UnderReview', 'NeedMoreInfo', 'Approved', 'Rejected', 'Withdrawn'].map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ),
          )}
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
                <th>Team</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data
                .filter((a) => !status || a.status === status)
                .map((a) => (
                  <tr key={a._id}>
                    <td>{a.teamId?.name}</td>
                    <td>
                      <Status value={a.status} />
                    </td>
                    <td>
                      <Link to={`/to/applications/${a._id}`}>Xét duyệt →</Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
          {!query.data.some((a) => !status || a.status === status) && <Empty />}
        </section>
      )}
    </>
  );
}
