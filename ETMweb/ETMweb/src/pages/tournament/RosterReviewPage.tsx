import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { competitionApi } from '../../services/competition';
import { managementApi } from '../../services/management';
import { PageHeading, QueryError, Spinner, Table } from '../../components/ui';
import { Empty, Status } from '../../components/management';
import { refId } from '../../types/management';
export function RosterReviewPage() {
  const { id = '' } = useParams();
  const [status, setStatus] = useState('');
  const query = useQuery({
    queryKey: ['to', id, 'rosters'],
    queryFn: async () => {
      const [rosters, applications] = await Promise.all([
        competitionApi.rosters({ tournamentId: id }),
        managementApi.tournamentApplications(id),
      ]);
      return rosters.map((r) => ({
        ...r,
        team: applications.find((a) => refId(a.teamId) === r.teamId)?.teamId?.name,
      }));
    },
  });
  return (
    <>
      <PageHeading
        title="Xét duyệt đội hình"
        action={
          <Link className="button secondary" to={`/to/tournaments/${id}`}>
            Chi tiết giải
          </Link>
        }
      />
      <div className="filters">
        <select aria-label="Lọc roster" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {['Draft', 'Submitted', 'Approved', 'Rejected', 'Locked'].map((s) => (
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
                <th>Team</th>
                <th>Thành viên</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data
                .filter((r) => !status || r.status === status)
                .map((r) => (
                  <tr key={r._id}>
                    <td>{r.team || r.teamId}</td>
                    <td>{r.entries.length}</td>
                    <td>
                      <Status value={r.status} />
                    </td>
                    <td>
                      <Link to={`/to/rosters/${r._id}`}>Xét duyệt roster →</Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
          {!query.data.some((r) => !status || r.status === status) && <Empty />}
        </section>
      )}
    </>
  );
}
