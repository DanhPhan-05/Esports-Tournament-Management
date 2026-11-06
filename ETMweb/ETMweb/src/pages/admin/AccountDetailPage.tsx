import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Mail, Ban } from 'lucide-react';
import { adminApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Alert, Avatar, Badge, Button, PageHeading, QueryError, Spinner } from '../../components/ui';
import { formatDate, roleNames } from '../../utils/account';
import { AccountForm, DisableAccount } from './AccountForms';
export function AccountDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [modal, setModal] = useState<'edit' | 'disable' | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const query = useQuery({ queryKey: ['admin', 'account', id], queryFn: () => adminApi.account(id) });
  if (query.isPending) return <Spinner />;
  if (query.isError)
    return (
      <>
        <Link to="/admin/accounts">← Danh sách tài khoản</Link>
        <QueryError
          message={query.error.message}
          retry={() => {
            void query.refetch();
          }}
        />
      </>
    );
  const account = query.data;
  return (
    <>
      <Link className="back-link" to="/admin/accounts">
        ← Danh sách tài khoản
      </Link>
      <PageHeading
        eyebrow="ACCOUNT DETAILS"
        title={account.fullName}
        description={account.email}
        action={
          <Button onClick={() => setModal('edit')}>
            <Pencil size={16} /> Chỉnh sửa
          </Button>
        }
      />
      <Alert>{error}</Alert>
      <div className="profile-grid">
        <section className="panel profile-summary">
          <Avatar large name={account.fullName} url={account.avatarUrl} />
          <h2>{account.fullName}</h2>
          <p className="muted">{roleNames[account.systemRole]}</p>
          <Badge status={account.status} />
          <div className="stack-actions">
            {account.status === 'Pending' && (
              <Button
                variant="secondary"
                busy={sending}
                onClick={async () => {
                  setSending(true);
                  setError('');
                  try {
                    await adminApi.resend(id);
                    toast('Đã yêu cầu gửi lại email kích hoạt.');
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setSending(false);
                  }
                }}
              >
                <Mail size={16} /> Gửi lại kích hoạt
              </Button>
            )}
            {account._id !== user?._id && account.status !== 'Inactive' && (
              <Button variant="danger" onClick={() => setModal('disable')}>
                <Ban size={16} /> Vô hiệu hóa
              </Button>
            )}
          </div>
        </section>
        <section className="panel">
          <h2>Thông tin tài khoản</h2>
          <dl className="detail-facts">
            <dt>Mã tài khoản</dt>
            <dd className="mono">{account._id}</dd>
            <dt>Họ và tên</dt>
            <dd>{account.fullName}</dd>
            <dt>Email</dt>
            <dd>{account.email}</dd>
            <dt>Số điện thoại</dt>
            <dd>{account.phone || 'Chưa cập nhật'}</dd>
            <dt>Địa chỉ</dt>
            <dd>{account.address || 'Chưa cập nhật'}</dd>
            <dt>Vai trò</dt>
            <dd>{roleNames[account.systemRole]}</dd>
            <dt>Xác minh email</dt>
            <dd>{account.emailVerifiedAt ? formatDate(account.emailVerifiedAt, true) : 'Chưa xác minh'}</dd>
            <dt>Ngày tạo</dt>
            <dd>{formatDate(account.createdAt, true)}</dd>
            <dt>Cập nhật gần nhất</dt>
            <dd>{formatDate(account.updatedAt, true)}</dd>
          </dl>
        </section>
      </div>
      {modal === 'edit' && <AccountForm account={account} onClose={() => setModal(null)} />}
      {modal === 'disable' && <DisableAccount account={account} onClose={() => setModal(null)} />}
    </>
  );
}
