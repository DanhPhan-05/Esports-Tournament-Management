import { useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { managementApi, save } from '../../services/management';
import { api } from '../../services/api';
import { Alert, Button, Input, Modal, PageHeading, QueryError, Spinner, Table } from '../../components/ui';
import { ConfirmAction, DataForm, Empty, Status } from '../../components/management';
import { cleanHtml } from '../../utils/management';
import type { Template } from '../../types/management';

const channels = [
  { value: 'InApp', label: 'Trong ứng dụng' },
  { value: 'Email', label: 'Email' },
  { value: 'Both', label: 'Trong ứng dụng và email' },
];

type SendResult =
  { deliveryStatus: string } | { recipients: number; inApp: number; email: number; skipped: number };

function editableText(text: string, template: Template) {
  if (template.plainText) return text;
  const parsed = new DOMParser().parseFromString(cleanHtml(text), 'text/html');
  return (parsed.body.textContent || '').replace(/\{\{\w+\}\}/g, '').trim();
}

function SendNotification({
  initialTemplate,
  templates,
  templatesLoading,
  templatesError,
  retryTemplates,
  onClose,
  onSent,
}: {
  initialTemplate?: Template;
  templates: Template[];
  templatesLoading: boolean;
  templatesError?: string;
  retryTemplates: () => void;
  onClose: () => void;
  onSent: (channel: string, result: SendResult) => void;
}) {
  const [templateId, setTemplateId] = useState(initialTemplate?._id || '');
  const [title, setTitle] = useState(
    initialTemplate ? editableText(initialTemplate.subject, initialTemplate) : '',
  );
  const [message, setMessage] = useState(
    initialTemplate ? editableText(initialTemplate.body, initialTemplate) : '',
  );
  const [channel, setChannel] = useState(initialTemplate?.channel || 'InApp');
  const [email, setEmail] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [audience, setAudience] = useState<'account' | 'all'>('account');
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selectedTemplate = templates.find((template) => template._id === templateId);
  const request = useRef<{ signature: string; id: string }>(null);
  const recipients = useQuery({
    queryKey: ['admin', 'notification-recipients', email.trim()],
    queryFn: () => managementApi.notificationRecipients(email.trim()),
    enabled: audience === 'account',
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = {
        audience,
        recipientId: audience === 'account' ? recipientId : undefined,
        templateId,
        title,
        message,
        channel,
      };
      const signature = JSON.stringify(payload);
      if (request.current?.signature !== signature) {
        const bytes = crypto.getRandomValues(new Uint8Array(18));
        request.current = {
          signature,
          id: Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''),
        };
      }
      const result = await save<SendResult>('/admin/notifications/send', {
        ...payload,
        requestId: request.current.id,
      });
      onSent(channel, result.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Tạo thông báo"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p className="muted">Kiểm tra nội dung và người nhận trước khi bấm Gửi ngay.</p>
      <Alert>{error}</Alert>
      <form onSubmit={submit}>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <div className="field">
            <label htmlFor="notice-template">Mẫu thông báo</label>
            <select
              id="notice-template"
              value={templateId}
              onChange={(event) => {
                const selected = templates.find((template) => template._id === event.target.value);
                setTemplateId(event.target.value);
                if (selected) {
                  setTitle(editableText(selected.subject, selected));
                  setMessage(editableText(selected.body, selected));
                  setChannel(selected.channel);
                }
              }}
            >
              <option value="">{templatesLoading ? 'Đang tải mẫu…' : 'Soạn nội dung mới'}</option>
              {templates.map((template) => (
                <option value={template._id} key={template._id}>
                  {editableText(template.subject, template) || 'Mẫu thông báo'}
                </option>
              ))}
            </select>
            {templatesError && <QueryError message={templatesError} retry={retryTemplates} />}
            {selectedTemplate && !selectedTemplate.plainText && (
              <small>Kiểm tra và bổ sung các chi tiết trước khi gửi mẫu cũ.</small>
            )}
          </div>
          <div className="field">
            <label htmlFor="notice-audience">Đối tượng nhận</label>
            <select
              id="notice-audience"
              value={audience}
              onChange={(event) => {
                setAudience(event.target.value === 'all' ? 'all' : 'account');
                setConfirmAll(false);
              }}
            >
              <option value="account">Một tài khoản</option>
              <option value="all">Tất cả tài khoản đang hoạt động</option>
            </select>
          </div>
          <Input
            label="Tiêu đề"
            value={title}
            maxLength={200}
            required
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="field">
            <label htmlFor="notice-message">Nội dung</label>
            <textarea
              id="notice-message"
              rows={5}
              value={message}
              maxLength={5000}
              required
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          {audience === 'account' && (
            <>
              <Input
                label="Tìm người nhận theo email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setRecipientId('');
                }}
              />
              <div className="field">
                <label htmlFor="notice-recipient">Người nhận</label>
                <select
                  id="notice-recipient"
                  value={recipientId}
                  required
                  onChange={(e) => setRecipientId(e.target.value)}
                >
                  <option value="">{recipients.isPending ? 'Đang tìm tài khoản…' : 'Chọn tài khoản'}</option>
                  {recipients.data?.data.map((account) => (
                    <option value={account._id} key={account._id}>
                      {account.fullName} ({account.email})
                    </option>
                  ))}
                </select>
                {recipients.isError && (
                  <QueryError
                    message={recipients.error.message}
                    retry={() => {
                      void recipients.refetch();
                    }}
                  />
                )}
                {recipients.data?.data.length === 0 && (
                  <small>Không tìm thấy tài khoản đang hoạt động.</small>
                )}
                {(recipients.data?.pagination?.total || 0) > 20 && (
                  <small>Nhập thêm email để thu hẹp danh sách.</small>
                )}
              </div>
            </>
          )}
          {audience === 'all' && (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={confirmAll}
                onChange={(e) => setConfirmAll(e.target.checked)}
                required
              />
              Xác nhận gửi cho tất cả tài khoản đang hoạt động theo kênh họ đã bật.
            </label>
          )}
          <div className="field">
            <label htmlFor="notice-channel">Kênh gửi</label>
            <select id="notice-channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
              {channels.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
        <div className="form-actions">
          <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button
            type="submit"
            busy={busy}
            disabled={(audience === 'all' ? !confirmAll : !recipientId) || !title.trim() || !message.trim()}
          >
            Gửi ngay
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function TemplatesPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'templates'], queryFn: managementApi.templates });
  const events = useQuery({
    queryKey: ['admin', 'notification-events'],
    queryFn: managementApi.notificationEvents,
  });
  const [edit, setEdit] = useState<Template | 'new' | null>(null);
  const [compose, setCompose] = useState<Template | 'new' | null>(null);
  const [preview, setPreview] = useState<Template | null>(null);
  const [disable, setDisable] = useState<Template | null>(null);
  const [status, setStatus] = useState('');
  const eventFor = (template: Template) =>
    template.automaticEvent ?? events.data?.find((event) => event.key === template.key);
  const activeTemplates = (query.data || []).filter((template) => template.isActive);
  const editing = edit && edit !== 'new' ? edit : null;
  const editEvent = editing && eventFor(editing);
  return (
    <>
      <PageHeading
        title="Quản lý thông báo"
        description="Soạn và gửi thông báo, hoặc lưu mẫu để dùng lại. Lưu mẫu chưa gửi thông báo."
        action={
          <Button
            onClick={() => {
              setStatus('');
              setCompose('new');
            }}
          >
            Tạo thông báo
          </Button>
        }
      />
      <Alert kind="info">{status}</Alert>
      <PageHeading
        title="Mẫu thông báo"
        action={
          <Button variant="secondary" onClick={() => setEdit('new')}>
            Thêm mẫu
          </Button>
        }
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
                <th>Tiêu đề</th>
                <th>Khi nào gửi</th>
                <th>Người nhận</th>
                <th>Kênh</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((template) => {
                const event = eventFor(template);
                return (
                  <tr key={template._id}>
                    <td>
                      {editableText(template.subject, template)} · v{template.version}
                    </td>
                    <td>{event?.label || 'Gửi thủ công'}</td>
                    <td>{event?.recipients || 'Chọn khi gửi'}</td>
                    <td>{channels.find((option) => option.value === template.channel)?.label}</td>
                    <td>
                      <Status value={template.isActive ? 'Active' : 'Inactive'} />
                    </td>
                    <td>
                      <Button variant="ghost" onClick={() => setPreview(template)}>
                        Xem trước
                      </Button>
                      {template.isActive && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setStatus('');
                            setCompose(template);
                          }}
                        >
                          Dùng mẫu
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        disabled={query.data.some(
                          (other) => other.key === template.key && other.version > template.version,
                        )}
                        onClick={() => setEdit(template)}
                      >
                        Chỉnh sửa
                      </Button>
                      {template.isActive && (
                        <Button variant="ghost" onClick={() => setDisable(template)}>
                          Vô hiệu hóa
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {!query.data.length && <Empty />}
        </section>
      )}
      {preview && (
        <Modal title={editableText(preview.subject, preview)} onClose={() => setPreview(null)}>
          <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {editableText(preview.body, preview) || 'Nội dung của mẫu cũ được điền khi phát sinh sự kiện.'}
          </p>
        </Modal>
      )}
      {edit && (
        <DataForm
          title={editing ? 'Sửa mẫu thông báo' : 'Tạo mẫu thông báo'}
          onClose={() => setEdit(null)}
          defaults={
            editing
              ? {
                  subject: editableText(editing.subject, editing),
                  body: editableText(editing.body, editing),
                  channel: editing.channel,
                  event: editEvent ? editEvent.key : '',
                }
              : { channel: 'InApp', event: '' }
          }
          fields={[
            { name: 'subject', label: 'Tiêu đề', required: true },
            { name: 'body', label: 'Nội dung', required: true, type: 'textarea' },
            {
              name: 'event',
              label: 'Khi nào gửi',
              disabled: !!editing,
              options: [
                { value: '', label: 'Gửi thủ công' },
                ...(events.data || (editEvent ? [editEvent] : [])).map((event) => ({
                  value: event.key,
                  label: event.label,
                })),
              ],
            },
            { name: 'channel', label: 'Kênh gửi', options: channels },
          ]}
          submit={async (values) => {
            await save(
              `/admin/notifications${editing ? `/${editing._id}` : ''}`,
              { ...values, isActive: true },
              editing ? 'put' : 'post',
            );
          }}
        >
          {(form) => {
            const event = editing
              ? editEvent
              : events.data?.find((entry) => entry.key === form.watch('event'));
            return (
              <>
                <p className="muted">
                  {event
                    ? `Hệ thống tự gửi khi có sự kiện này. Người nhận là ${event.recipients.toLocaleLowerCase('vi')}.`
                    : 'Chọn người nhận trong mục Tạo thông báo.'}
                  {editing &&
                    !editing.plainText &&
                    ' Mẫu cũ được chuyển sang văn bản thường. Hãy kiểm tra và bổ sung nội dung trước khi lưu.'}
                </p>
                {!editing && events.isError && (
                  <QueryError
                    message="Không tải được danh sách sự kiện tự động."
                    retry={() => {
                      void events.refetch();
                    }}
                  />
                )}
              </>
            );
          }}
        </DataForm>
      )}
      {compose && (
        <SendNotification
          initialTemplate={compose === 'new' ? undefined : compose}
          templates={activeTemplates}
          templatesLoading={query.isPending}
          templatesError={query.error?.message}
          retryTemplates={() => {
            void query.refetch();
          }}
          onClose={() => setCompose(null)}
          onSent={(channel, result) => {
            setCompose(null);
            if ('recipients' in result) {
              setStatus(
                `Đã xử lý cho ${result.recipients} tài khoản. Trong ứng dụng: ${result.inApp}. Email chờ gửi: ${result.email}. Bỏ qua do tùy chọn nhận: ${result.skipped}.`,
              );
              void client.invalidateQueries({ queryKey: ['notifications'] });
              return;
            }
            const { deliveryStatus } = result;
            const inApp = channel === 'Email' ? '' : 'Đã gửi thông báo trong ứng dụng.';
            const email =
              channel === 'InApp'
                ? ''
                : deliveryStatus === 'Sent'
                  ? 'Đã gửi email.'
                  : deliveryStatus === 'Skipped'
                    ? 'Email đã được bỏ qua. Hãy kiểm tra cấu hình SMTP và tùy chọn của người nhận.'
                    : deliveryStatus === 'Failed'
                      ? 'Gửi email thất bại. Hệ thống sẽ thử lại.'
                      : 'Email đang được xử lý.';
            setStatus([inApp, email].filter(Boolean).join(' '));
            void client.invalidateQueries({ queryKey: ['notifications'] });
          }}
        />
      )}
      {disable && (
        <ConfirmAction
          title="Vô hiệu hóa mẫu?"
          description={
            eventFor(disable)
              ? 'Thông báo tự động sẽ dùng nội dung mặc định của hệ thống.'
              : 'Thông báo đã gửi được giữ nguyên.'
          }
          onClose={() => setDisable(null)}
          action={() => api.delete(`/admin/notifications/${disable._id}`)}
        />
      )}
    </>
  );
}
