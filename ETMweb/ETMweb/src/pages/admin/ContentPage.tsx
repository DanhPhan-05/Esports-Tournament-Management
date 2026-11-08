import { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { communityApi } from '../../services/community';
import { save } from '../../services/management';
import { api } from '../../services/api';
import { Button, PageHeading, Pagination, QueryError, Spinner, Table } from '../../components/ui';
import { ConfirmAction, DataForm, Empty, ImageUpload, Status } from '../../components/management';
import { cleanHtml } from '../../utils/management';
import type { Article } from '../../types/community';
const RichTextEditor = lazy(() =>
  import('../../components/RichTextEditor').then((m) => ({ default: m.RichTextEditor })),
);
export function ContentPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [edit, setEdit] = useState<Article | 'new' | null>(null);
  const [archive, setArchive] = useState<Article | null>(null);
  const query = useQuery({
    queryKey: ['admin', 'content', page, search, status],
    queryFn: () => communityApi.content({ page, limit: 10, search, status: status || undefined }),
  });
  return (
    <>
      <PageHeading
        title="Quản lý nội dung"
        action={<Button onClick={() => setEdit('new')}>Tạo bài viết</Button>}
      />
      <div className="filters">
        <input
          aria-label="Tìm nội dung"
          placeholder="Tiêu đề bài viết…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Lọc trạng thái bài viết"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {['Draft', 'Published', 'Archived'].map((s) => (
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
                <th>Bài viết</th>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((a) => (
                <tr key={a._id}>
                  <td>{a.title}</td>
                  <td>{a.type}</td>
                  <td>
                    <Status value={a.status || 'Draft'} />
                  </td>
                  <td>
                    <Button variant="ghost" onClick={() => setEdit(a)}>
                      Chỉnh sửa
                    </Button>
                    {a.status !== 'Archived' && (
                      <Button variant="ghost" onClick={() => setArchive(a)}>
                        Lưu trữ
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!query.data.data.length && <Empty />}
          <Pagination
            label="bài viết"
            page={page}
            total={query.data.pagination?.total || 0}
            limit={10}
            onChange={setPage}
          />
        </section>
      )}
      {edit && (
        <DataForm
          title={edit === 'new' ? 'Tạo bài viết' : 'Chỉnh sửa bài viết'}
          defaults={
            edit === 'new'
              ? { type: 'News', body: '', publish: false }
              : { ...edit, publish: edit.status === 'Published' }
          }
          onClose={() => setEdit(null)}
          fields={[
            { name: 'title', label: 'Tiêu đề bài viết', required: true },
            { name: 'slug', label: 'Slug bài viết', required: true },
            {
              name: 'type',
              label: 'Loại bài viết',
              options: ['News', 'Announcement', 'Update'].map((v) => ({ value: v, label: v })),
            },
            { name: 'summary', label: 'Tóm tắt', type: 'textarea' },
          ]}
          submit={async (v) => {
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug))
              throw new Error('Slug chỉ chứa chữ thường, số và dấu gạch ngang.');
            const body = cleanHtml(v.body || '');
            if (!body.replace(/<[^>]*>/g, '').trim()) throw new Error('Nhập nội dung bài viết.');
            await save(
              `/admin/content${edit === 'new' ? '' : `/${edit._id}`}`,
              {
                title: v.title,
                slug: v.slug,
                type: v.type,
                summary: v.summary,
                body,
                imageUrl: v.imageUrl,
                videoUrl: v.videoUrl,
                status: v.publish ? 'Published' : 'Draft',
              },
              edit === 'new' ? 'post' : 'put',
            );
          }}
        >
          {(form) => (
            <>
              <ImageUpload
                scope="content-image"
                entityId={edit !== 'new' ? edit?._id : undefined}
                assetName={form.watch('slug') || form.watch('title')}
                disabled={!!form.watch('_uploading')}
                value={form.watch('imageUrl')}
                onChange={(url) => form.setValue('imageUrl', url)}
                onBusy={(busy) => form.setValue('_uploading', busy)}
              />
              <Suspense fallback={<Spinner />}>
                <ImageUpload
                  kind="video"
                  scope="content-video"
                  entityId={edit !== 'new' ? edit?._id : undefined}
                  assetName={form.watch('slug') || form.watch('title')}
                  disabled={!!form.watch('_uploading')}
                  value={form.watch('videoUrl')}
                  onChange={(url) => form.setValue('videoUrl', url)}
                  onBusy={(busy) => form.setValue('_uploading', busy)}
                />
                <RichTextEditor
                  label="Nội dung bài viết"
                  variables={[]}
                  value={form.getValues('body') || ''}
                  onChange={(value) => form.setValue('body', value)}
                />
              </Suspense>
              <label className="checkbox-row">
                <input type="checkbox" {...form.register('publish')} />
                Xuất bản ngay
              </label>
            </>
          )}
        </DataForm>
      )}
      {archive && (
        <ConfirmAction
          title="Lưu trữ bài viết?"
          description="Bài viết sẽ không còn xuất hiện trên trang công khai."
          onClose={() => setArchive(null)}
          action={() => api.delete(`/admin/content/${archive._id}`)}
        />
      )}
    </>
  );
}
