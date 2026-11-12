import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Save, LockKeyhole, Bell, Eye } from 'lucide-react';
import { Alert, Avatar, Badge, Button, Input, PageHeading, PasswordField } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { profileApi } from '../services/api';
import { formatDate, roleNames } from '../utils/account';
import { nameRule, passwordRule, validateImage } from '../utils/validation';
import type { ProfileInput } from '../types';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    defaultValues: { fullName: user!.fullName, phone: user!.phone || '', address: user!.address || '' },
  });
  return (
    <>
      <PageHeading
        eyebrow="YOUR ACCOUNT"
        title="Hồ sơ cá nhân"
        description="Quản lý thông tin mà bạn chia sẻ trên ETM."
      />
      <div className="profile-grid">
        <section className="panel profile-summary">
          <div className="profile-avatar">
            <Avatar large name={user!.fullName} url={user!.avatarUrl} />
            <label className={`upload-button ${uploading ? 'disabled' : ''}`}>
              <Camera size={16} />
              <span>{uploading ? 'Đang tải…' : 'Đổi ảnh'}</span>
              <input
                aria-label="Chọn ảnh đại diện"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  const invalid = validateImage(file);
                  if (invalid) {
                    setError(invalid);
                    return;
                  }
                  setError('');
                  setUploading(true);
                  try {
                    const result = await profileApi.avatar(file);
                    updateUser({ ...user!, avatarUrl: result.url });
                    toast('Đã cập nhật ảnh đại diện.');
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
          </div>
          <h2>{user!.fullName}</h2>
          <p className="muted">{roleNames[user!.systemRole]}</p>
          <Badge status={user!.status} />
          <dl className="facts">
            <dt>Email</dt>
            <dd>{user!.email}</dd>
            <dt>Ngày tham gia</dt>
            <dd>{formatDate(user!.createdAt)}</dd>
            <dt>Xác minh email</dt>
            <dd>{user!.emailVerifiedAt ? 'Đã xác minh' : 'Chưa xác minh'}</dd>
          </dl>
          <p className="small muted">Ảnh PNG, JPEG hoặc WebP · tối đa 10 MB</p>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Thông tin cá nhân</h2>
            <span className="muted small">* Thông tin bắt buộc</span>
          </div>
          <Alert>{error}</Alert>
          <form
            noValidate
            onSubmit={handleSubmit(async (values) => {
              setError('');
              try {
                const account = await profileApi.update({ ...values, fullName: values.fullName.trim() });
                updateUser(account);
                reset({
                  fullName: account.fullName,
                  phone: account.phone || '',
                  address: account.address || '',
                });
                toast('Đã lưu thông tin cá nhân.');
              } catch (e) {
                setError((e as Error).message);
              }
            })}
          >
            <Input
              label="Họ và tên *"
              autoComplete="name"
              {...register('fullName', nameRule)}
              error={errors.fullName?.message}
            />
            <Input
              label="Email"
              value={user!.email}
              disabled
              hint="Email dùng để đăng nhập và nhận thông báo."
            />
            <Input
              label="Số điện thoại"
              autoComplete="tel"
              type="tel"
              {...register('phone', { maxLength: { value: 20, message: 'Tối đa 20 ký tự.' } })}
              error={errors.phone?.message}
            />
            <Input
              label="Địa chỉ"
              autoComplete="street-address"
              {...register('address', { maxLength: { value: 300, message: 'Tối đa 300 ký tự.' } })}
              error={errors.address?.message}
            />
            <div className="form-actions">
              <Button type="submit" busy={isSubmitting} disabled={!isDirty}>
                <Save size={16} /> Lưu thay đổi
              </Button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
export function SettingsPage() {
  const [search, setSearch] = useSearchParams();
  const tab = search.get('tab') || 'privacy';
  return (
    <>
      <PageHeading
        eyebrow="PREFERENCES"
        title="Cài đặt tài khoản"
        description="Điều chỉnh quyền riêng tư, thông báo và bảo mật."
      />
      <div className="tabs" role="tablist" aria-label="Cài đặt">
        {[
          { id: 'privacy', label: 'Quyền riêng tư', Icon: Eye },
          { id: 'notifications', label: 'Thông báo', Icon: Bell },
          { id: 'password', label: 'Mật khẩu', Icon: LockKeyhole },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            aria-controls="settings-panel"
            onClick={() => setSearch({ tab: id })}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      <section id="settings-panel" role="tabpanel" className="panel settings-panel">
        {tab === 'password' ? <PasswordSettings /> : <PreferenceSettings key={tab} tab={tab} />}
      </section>
    </>
  );
}
function PreferenceSettings({ tab }: { tab: string }) {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showProfile, setShowProfile] = useState(user?.privacy?.showProfile ?? true);
  const [email, setEmail] = useState(user?.notificationSettings?.email ?? true);
  const [inApp, setInApp] = useState(user?.notificationSettings?.inApp ?? true);
  const notifications = tab === 'notifications';
  return (
    <>
      <h2>{notifications ? 'Thông báo của bạn' : 'Hiển thị hồ sơ'}</h2>
      <p className="muted">
        {notifications
          ? 'Chọn kênh nhận thông báo từ hệ thống.'
          : 'Kiểm soát việc hiển thị thông tin cá nhân.'}
      </p>
      <Alert>{error}</Alert>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError('');
          setBusy(true);
          try {
            const account = await profileApi.update(
              notifications ? { notificationSettings: { email, inApp } } : { privacy: { showProfile } },
            );
            updateUser(account);
            toast('Đã lưu cài đặt.');
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {notifications ? (
          <>
            <Toggle
              label="Thông báo qua email"
              description="Nhận thông tin liên quan đến hoạt động của bạn qua email."
              checked={email}
              onChange={setEmail}
            />
            <Toggle
              label="Thông báo trong hệ thống"
              description="Cho phép thông báo hiển thị khi sử dụng ETM."
              checked={inApp}
              onChange={setInApp}
            />
          </>
        ) : (
          <Toggle
            label="Công khai hồ sơ"
            description="Cho phép hiển thị hồ sơ của bạn với người dùng khác."
            checked={showProfile}
            onChange={setShowProfile}
          />
        )}
        <div className="form-actions">
          <Button type="submit" busy={busy}>
            Lưu cài đặt
          </Button>
        </div>
      </form>
    </>
  );
}
function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}
function PasswordSettings() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { clearRevokedSession } = useAuth();
  const {
    register,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ current: string; password: string; confirm: string }>();
  return (
    <>
      <h2>Đổi mật khẩu</h2>
      <p className="muted">Sau khi thay đổi mật khẩu, bạn cần đăng nhập lại trên các thiết bị.</p>
      <Alert>{error}</Alert>
      <form
        noValidate
        onSubmit={handleSubmit(async (v) => {
          setError('');
          try {
            await profileApi.password(v.current, v.password);
            clearRevokedSession();
            navigate('/login', {
              replace: true,
              state: { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' },
            });
          } catch (e) {
            setError((e as Error).message);
          }
        })}
      >
        <PasswordField
          label="Mật khẩu hiện tại"
          autoComplete="current-password"
          {...register('current', { required: 'Vui lòng nhập mật khẩu hiện tại.' })}
          error={errors.current?.message}
        />
        <PasswordField
          label="Mật khẩu mới"
          autoComplete="new-password"
          {...register('password', {
            ...passwordRule,
            validate: (v) =>
              v === getValues('current') ? 'Chọn mật khẩu khác mật khẩu hiện tại.' : passwordRule.validate(v),
          })}
          hint="Ít nhất 8 ký tự, gồm chữ, số và ký tự đặc biệt."
          error={errors.password?.message}
        />
        <PasswordField
          label="Xác nhận mật khẩu mới"
          autoComplete="new-password"
          {...register('confirm', {
            validate: (v) => v === getValues('password') || 'Mật khẩu xác nhận không khớp.',
          })}
          error={errors.confirm?.message}
        />
        <Button busy={isSubmitting} type="submit">
          Đổi mật khẩu
        </Button>
      </form>
    </>
  );
}
