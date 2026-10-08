import { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { managementApi, save } from '../../services/management';
import { api } from '../../services/api';
import { Button, Input, Modal, PageHeading, QueryError, Spinner, Table } from '../../components/ui';
import { ConfirmAction, DataForm, Empty, Status } from '../../components/management';
const RichTextEditor = lazy(() =>
  import('../../components/RichTextEditor').then((module) => ({ default: module.RichTextEditor })),
);
import { cleanHtml } from '../../utils/management';
import type { Template } from '../../types/management';
function TemplatePreview({ template }: { template: Template }) {
  const [samples, setSamples] = useState<Record<string, string>>({});
  const render = (text: string) => text.replace(/\{\{(\w+)\}\}/g, (_, key) => samples[key] || `[${key}]`);
  return (
    <>
      <h3>{render(template.subject)}</h3>
      <div
        className="template-preview prose"
        dangerouslySetInnerHTML={{ __html: cleanHtml(render(template.body)) }}
      />
      {template.variables.map((v) => (
        <Input
          key={v}
          id={`preview-${v}`}
          label={`Giá trị mẫu: ${v}`}
          value={samples[v] || ''}
          onChange={(e) => setSamples({ ...samples, [v]: e.target.value })}
        />
      ))}
    </>
  );
}
export function TemplatesPage() {
  const query = useQuery({ queryKey: ['admin', 'templates'], queryFn: managementApi.templates });
  const [edit, setEdit] = useState<Template | 'new' | null>(null);
  const [preview, setPreview] = useState<Template | null>(null);
  const [disable, setDisable] = useState<Template | null>(null);
  return (
    <>
      <PageHeading
        title="Mẫu thông báo"
        description="Mỗi lần sửa tạo một phiên bản mới và ngừng phiên bản trước."
        action={<Button onClick={() => setEdit('new')}>Thêm mẫu</Button>}
      />
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
                <th>Mã / Phiên bản</th>
                <th>Tiêu đề</th>
                <th>Kênh</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((t) => (
                <tr key={t._id}>
                  <td>
                    {t.key} · v{t.version}
                  </td>
                  <td>{t.subject}</td>
                  <td>{t.channel}</td>
                  <td>
                    <Status value={t.isActive ? 'Active' : 'Inactive'} />
                  </td>
                  <td>
                    <Button variant="ghost" onClick={() => setPreview(t)}>
                      Xem trước
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={query.data.some((other) => other.key === t.key && other.version > t.version)}
                      onClick={() => setEdit(t)}
                    >
                      Chỉnh sửa
                    </Button>
                    {t.isActive && (
                      <Button variant="ghost" onClick={() => setDisable(t)}>
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
      {preview && (
        <Modal title="Xem trước mẫu thông báo" onClose={() => setPreview(null)}>
          <TemplatePreview template={preview} />
        </Modal>
      )}
      {edit && (
        <DataForm
          title={edit === 'new' ? 'Tạo mẫu thông báo' : 'Sửa mẫu thông báo'}
          onClose={() => setEdit(null)}
          defaults={
            edit === 'new'
              ? { channel: 'InApp', isActive: true, body: '', variables: '' }
              : { ...edit, variables: edit.variables.join(', ') }
          }
          fields={[
            { name: 'key', label: 'Mã mẫu', required: true, disabled: edit !== 'new' },
            { name: 'event', label: 'Sự kiện nghiệp vụ' },
            { name: 'subject', label: 'Tiêu đề', required: true },
            {
              name: 'channel',
              label: 'Kênh gửi',
              options: ['InApp', 'Email', 'Both'].map((v) => ({ value: v, label: v })),
            },
            { name: 'variables', label: 'Biến (phân cách bằng dấu phẩy)' },
          ]}
          submit={async (v) => {
            const variables = String(v.variables || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            if (variables.some((s) => !/^\w+$/.test(s)))
              throw new Error('Tên biến chỉ chứa chữ, số và gạch dưới.');
            const body = cleanHtml(v.body || '');
            if (!body.replace(/<[^>]*>/g, '').trim()) throw new Error('Vui lòng nhập nội dung mẫu.');
            const placeholders = [...(v.subject + ' ' + body).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
            if (placeholders.some((p) => !variables.includes(p)))
              throw new Error('Khai báo đầy đủ các biến được dùng trong nội dung/tiêu đề.');
            await save(
              `/admin/notifications${edit === 'new' ? '' : `/${edit._id}`}`,
              {
                key: v.key,
                subject: v.subject,
                event: v.event,
                channel: v.channel,
                isActive: !!v.isActive,
                variables: [...new Set(variables)],
                body,
              },
              edit === 'new' ? 'post' : 'put',
            );
          }}
        >
          {(form) => (
            <>
              <label className="field">Nội dung</label>
              <Suspense fallback={<Spinner label="Đang tải trình soạn thảo…" />}>
                <RichTextEditor
                  value={form.getValues('body') || ''}
                  onChange={(html) => form.setValue('body', html)}
                  variables={String(form.watch('variables') || '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)}
                />
              </Suspense>
              <label className="checkbox-row">
                <input type="checkbox" {...form.register('isActive')} />
                Đang hoạt động
              </label>
              <h3>Xem trước</h3>
              <div
                className="template-preview prose"
                dangerouslySetInnerHTML={{ __html: cleanHtml(form.watch('body') || '') }}
              />
            </>
          )}
        </DataForm>
      )}
      {disable && (
        <ConfirmAction
          title="Vô hiệu hóa mẫu?"
          description="Thông báo đã phát hành được giữ nguyên."
          onClose={() => setDisable(null)}
          action={() => api.delete(`/admin/notifications/${disable._id}`)}
        />
      )}
    </>
  );
}
