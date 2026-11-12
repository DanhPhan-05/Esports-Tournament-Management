import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useClub } from './ClubScope';
import { managementApi } from '../../services/management';
import { competitionApi } from '../../services/competition';
import { PageHeading, QueryError, Spinner, Table } from '../../components/ui';
import { Empty, Status } from '../../components/management';
export function RostersPage() {
  const club = useClub();
  const query = useQuery({
    queryKey: ['cm', club._id, 'rosters'],
    queryFn: async () => {
      const applications = (await managementApi.applications()).filter((a) => a.teamId?.clubId === club._id);
      return competitionApi.clubRosters(applications);
    },
  });
  return (
    <>
      <PageHeading title="Đội hình tham dự giải" description="Mỗi hồ sơ có một roster riêng cho giải đấu." />
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
                <th>Giải đấu</th>
                <th>Team</th>
                <th>Số thành viên</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data.map(({ roster: r, application: a }) => (
                <tr key={r._id}>
                  <td>{typeof a.tournamentId === 'object' ? a.tournamentId.name : 'Giải đấu'}</td>
                  <td>{a.teamId?.name}</td>
                  <td>{r.entries.length}</td>
                  <td>
                    <Status value={r.status} />
                  </td>
                  <td>
                    <Link to={`/cm/rosters/${r._id}/edit`}>Quản lý roster →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!query.data.length && <Empty>Chưa có roster. Hãy tạo hồ sơ đăng ký giải trước.</Empty>}
        </section>
      )}
    </>
  );
}
