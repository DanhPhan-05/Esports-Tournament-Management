import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { managementApi, save } from '../services/management';
import { Alert, Button, PageHeading, Pagination, QueryError, Spinner } from '../components/ui';
import { Empty } from '../components/management';
import { cleanHtml } from '../utils/management';
import { safeReturnTo, formatDate } from '../utils/account';
export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [unread, setUnread] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['notifications', page, unread],
    queryFn: () => managementApi.notices({ page, limit: 10, unread: unread ? 'true' : undefined }),
  });
  return (
    <>
      <PageHeading
        title="Thông báo của bạn"
        description="Theo dõi các thông báo liên quan đến hoạt động trong hệ thống."
      />
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={unread}
          onChange={(e) => {
            setUnread(e.target.checked);
            setPage(1);
          }}
        />
        Chỉ hiện chưa đọc
      </label>
      <Alert>{error}</Alert>
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
        <section className="panel">
          <p className="muted">{query.data.unread} thông báo chưa đọc</p>
          {query.data.data.map((n) => (
            <article className={`notice ${n.readAt ? '' : 'unread'}`} key={n._id}>
              <div>
                <h2>{n.title}</h2>
                <small className="muted">{formatDate(n.createdAt, true)}</small>
                <div className="prose" dangerouslySetInnerHTML={{ __html: cleanHtml(n.message) }} />
                {n.link && safeReturnTo(n.link, '') && <Link to={n.link}>Xem nội dung →</Link>}
              </div>
              {!n.readAt && (
                <Button
                  variant="secondary"
                  busy={busy === n._id}
                  onClick={async () => {
                    setBusy(n._id);
                    setError('');
                    try {
                      await save(`/notifications/${n._id}/read`, {}, 'put');
                      await client.invalidateQueries({ queryKey: ['notifications'] });
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy('');
                    }
                  }}
                >
                  Đánh dấu đã đọc
                </Button>
              )}
            </article>
          ))}
          {!query.data.data.length && <Empty>Không có thông báo phù hợp.</Empty>}
          <Pagination
            label="thông báo"
            page={page}
            limit={10}
            total={query.data.pagination?.total || 0}
            onChange={setPage}
          />
        </section>
      )}
    </>
  );
}
