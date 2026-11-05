import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Input, Modal } from '../../components/ui';
import { adminApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { emailRule, nameRule } from '../../utils/validation';
import { roles, roleNames, statuses, statusNames } from '../../utils/account';
import type { Account, AccountEdit, StaffInput } from '../../types';

export function AccountForm({ account, onClose }: { account?: Account; onClose: () => void }) {
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();
  const auth = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StaffInput & AccountEdit>({
    defaultValues: account
      ? {
          fullName: account.fullName,
          email: account.email,
          phone: account.phone || '',
          systemRole: account.systemRole as StaffInput['systemRole'],
          status: account.status,
          verified: !!account.emailVerifiedAt,
        }
      : { systemRole: 'ClubManager', fullName: '', email: '', phone: '' },
  });
  const self = account?._id === auth.user?._id;
  return (
    <Modal title={account ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản nhân sự'} onClose={onClose}>
      <p className="muted small">
        {account
          ? 'Cập nhật thông tin, vai trò và trạng thái tài khoản.'
          : 'Nhân sự sẽ nhận email kích hoạt để tự thiết lập mật khẩu.'}
      </p>
      <Alert>{error}</Alert>
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setError('');
          try {
            if (account) {
              await adminApi.update(account._id, {
                fullName: values.fullName.trim(),
                phone: values.phone,
                systemRole: values.systemRole,
                status: values.status,
                ...(!account.emailVerifiedAt && values.verified ? { verified: true } : {}),
              });
            } else
              await adminApi.create({
                fullName: values.fullName.trim(),
                email: values.email.trim(),
                phone: values.phone,
                systemRole: values.systemRole,
              });
            if (self) {
              onClose();
              auth.clearRevokedSession();
              navigate('/login', {
                replace: true,
                state: { message: 'Thông tin đã được cập nhật. Vui lòng đăng nhập lại.' },
              });
              return;
            }
            await queryClient.invalidateQueries({ queryKey: ['admin'] });
            toast(account ? 'Đã cập nhật tài khoản.' : 'Đã tạo tài khoản và yêu cầu gửi email kích hoạt.');
            onClose();
          } catch (e) {
            setError((e as Error).message);
          }
        })}
      >
        <Input label="Họ và tên" {...register('fullName', nameRule)} error={errors.fullName?.message} />
        <Input
          label="Email"
          type="email"
          disabled={!!account}
          {...register('email', emailRule)}
          error={errors.email?.message}
        />
        <Input
          label="Số điện thoại"
          {...register('phone', { maxLength: { value: 20, message: 'Tối đa 20 ký tự.' } })}
          error={errors.phone?.message}
        />
        <div className="field">
          <label htmlFor="staff-role">Vai trò</label>
          <select id="staff-role" {...register('systemRole')} disabled={self}>
            {(account ? roles : roles.filter((r) => r === 'ClubManager' || r === 'TournamentOrganizer')).map(
              (role) => (
                <option
                  key={role}
                  value={role}
                  disabled={!!account && role === 'Administrator' && account.systemRole !== 'Administrator'}
                >
                  {roleNames[role]}
                </option>
              ),
            )}
          </select>
        </div>
        {account && (
          <>
            <div className="field">
              <label htmlFor="staff-status">Trạng thái</label>
              <select id="staff-status" {...register('status')} disabled={self}>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusNames[status]}
                  </option>
                ))}
              </select>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" {...register('verified')} disabled={!!account.emailVerifiedAt} />
              Xác minh email {account.emailVerifiedAt && '(đã xác minh)'}
            </label>
            <p className="small muted">
              Cập nhật tài khoản sẽ kết thúc các phiên đăng nhập của tài khoản này.
            </p>
          </>
        )}
        <div className="form-actions">
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" busy={isSubmitting}>
            {account ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function DisableAccount({ account, onClose }: { account: Account; onClose: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const toast = useToast();
  return (
    <Modal title="Vô hiệu hóa tài khoản?" onClose={onClose}>
      <p>
        Tài khoản <strong>{account.email}</strong> sẽ không thể đăng nhập. Bạn có thể kích hoạt lại trong phần
        chỉnh sửa.
      </p>
      <Alert>{error}</Alert>
      <div className="form-actions">
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Hủy
        </Button>
        <Button
          variant="danger"
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await adminApi.disable(account._id);
              await client.invalidateQueries({ queryKey: ['admin'] });
              toast('Đã vô hiệu hóa tài khoản.');
              onClose();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Vô hiệu hóa
        </Button>
      </div>
    </Modal>
  );
}
