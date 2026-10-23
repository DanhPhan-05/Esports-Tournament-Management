import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { managementApi } from '../../services/management';
import { PageHeading, QueryError, Spinner, Table } from '../../components/ui';
import { Empty, Status } from '../../components/management';
import { formatDate } from '../../utils/account';
export function MatchesPage() {
  const { id = '' } = useParams();
  const [day, setDay] = useState('');
  const query = useQuery({ queryKey: ['to', id, 'report'], queryFn: () => managementApi.report(id) });
  return (
    <>
      <PageHeading
        title="Lịch và kết quả trận đấu"
        action={
          <Link className="button secondary" to={`/to/tournaments/${id}`}>
            Chi tiết giải
          </Link>
        }
      />
      <div className="field narrow">
        <label htmlFor="match-day">Ngày thi đấu (bỏ trống để xem tất cả)</label>
        <input id="match-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
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
                <th>Vòng</th>
                <th>Trận</th>
                <th>Lịch thi đấu</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data.schedule
                .filter(
                  (m) =>
                    !day || (m.scheduledAt && new Date(m.scheduledAt).toLocaleDateString('sv-SE') === day),
                )
                .map((m) => (
                  <tr key={m._id}>
                    <td>{m.round}</td>
                    <td>
                      {m.teamAId?.name || 'TBD'} — {m.teamBId?.name || 'TBD'}
                    </td>
                    <td>{formatDate(m.scheduledAt, true)}</td>
                    <td>
                      <Status value={m.status} />
                    </td>
                    <td>
                      <Link to={`/to/matches/${m._id}`}>Quản lý trận →</Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
          {!query.data.schedule.length && <Empty>Chưa có trận đấu. Hãy sinh nhánh đấu trước.</Empty>}
        </section>
      )}
    </>
  );
}
