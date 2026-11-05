import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowRight, MailCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { Alert, Button, Input, PasswordField, Spinner } from '../components/ui';
import { emailRule, nameRule, passwordRule } from '../utils/validation';
import { homeFor, loginDestination } from '../utils/account';

type Credentials = { email: string; password: string; confirm: string; fullName: string };
export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>();
  const target = (user: NonNullable<typeof auth.user>) => loginDestination(location.state?.from, user);
  if (auth.user) return <Navigate to={target(auth.user)} replace />;
  async function submit(values: Credentials) {
    setError('');
    try {
      const user = await auth.signIn({ email: values.email.trim(), password: values.password });
      navigate(target(user), { replace: true });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <h1>Đăng nhập</h1>
      <p className="muted">
        Chào mừng bạn trở lại hệ thống
        <br />
        Esports Tournament Management
      </p>
      <Alert kind="info">{auth.sessionMessage || location.state?.message}</Alert>
      <Alert>{error}</Alert>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <Input
          label="Email"
          type="email"
          placeholder="Nhập địa chỉ email"
          autoComplete="email"
          {...register('email', emailRule)}
          error={errors.email?.message}
        />
        <PasswordField
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          {...register('password', { required: 'Vui lòng nhập mật khẩu.' })}
          error={errors.password?.message}
        />
        <div className="form-link">
          <Link to="/forgot-password">Quên mật khẩu?</Link>
        </div>
        <Button busy={isSubmitting} type="submit" className="full">
          Đăng nhập <ArrowRight size={17} />
        </Button>
      </form>
      {import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true' && (
        <>
          <div className="divider">Hoặc đăng nhập với</div>
          <a className="button secondary full" href={authApi.googleUrl}>
            Tiếp tục với Google
          </a>
        </>
      )}
      <p className="auth-switch">
        Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
      </p>
    </>
  );
}
export function RegisterPage() {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>();
  if (done)
    return (
      <Success
        title="Kiểm tra hộp thư"
        description="Tài khoản đã được tạo. Mở liên kết xác minh trong email để kích hoạt tài khoản trước khi đăng nhập."
      />
    );
  return (
    <>
      <p className="eyebrow">JOIN THE COMMUNITY</p>
      <h1>Tạo tài khoản</h1>
      <p className="muted">Bắt đầu với một tài khoản ETM của riêng bạn.</p>
      <Alert>{error}</Alert>
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setError('');
          try {
            await authApi.register({
              fullName: values.fullName.trim(),
              email: values.email.trim(),
              password: values.password,
            });
            setDone(true);
          } catch (e) {
            setError((e as Error).message);
          }
        })}
      >
        <Input
          label="Họ và tên"
          autoComplete="name"
          {...register('fullName', nameRule)}
          error={errors.fullName?.message}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          {...register('email', emailRule)}
          error={errors.email?.message}
        />
        <PasswordField
          label="Mật khẩu"
          autoComplete="new-password"
          hint="Ít nhất 8 ký tự, gồm chữ, số và ký tự đặc biệt."
          {...register('password', passwordRule)}
          error={errors.password?.message}
        />
        <PasswordField
          label="Xác nhận mật khẩu"
          autoComplete="new-password"
          {...register('confirm', {
            validate: (v) => v === getValues('password') || 'Mật khẩu xác nhận không khớp.',
          })}
          error={errors.confirm?.message}
        />
        <Button type="submit" busy={isSubmitting} className="full">
          Tạo tài khoản <ArrowRight size={17} />
        </Button>
      </form>
      <p className="auth-switch">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </>
  );
}
function Success({ title, description }: { title: string; description: string }) {
  return (
    <div className="success-state">
      <MailCheck size={40} />
      <h1>{title}</h1>
      <p className="muted">{description}</p>
      <Link to="/login" className="button primary">
        Về trang đăng nhập
      </Link>
    </div>
  );
}
export function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>();
  if (done)
    return (
      <Success
        title="Yêu cầu đã được gửi"
        description="Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu. Hãy kiểm tra cả thư mục spam."
      />
    );
  return (
    <>
      <p className="eyebrow">ACCOUNT RECOVERY</p>
      <h1>Quên mật khẩu?</h1>
      <p className="muted">Nhập email để nhận liên kết đặt lại mật khẩu.</p>
      <Alert>{error}</Alert>
      <form
        noValidate
        onSubmit={handleSubmit(async (v) => {
          setError('');
          try {
            await authApi.forgotPassword(v.email.trim());
            setDone(true);
          } catch (e) {
            setError((e as Error).message);
          }
        })}
      >
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          {...register('email', emailRule)}
          error={errors.email?.message}
        />
        <Button type="submit" busy={isSubmitting} className="full">
          Gửi liên kết
        </Button>
      </form>
      <p className="auth-switch">
        <Link to="/login">← Quay lại đăng nhập</Link>
      </p>
    </>
  );
}
export function TokenPage({ mode }: { mode: 'reset' | 'activate' | 'verify' }) {
  const params = useParams();
  const [search] = useSearchParams();
  const token = params.token || params.key || search.get('token') || '';
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<{ password: string; confirm: string }>();
  const title =
    mode === 'reset' ? 'Đặt lại mật khẩu' : mode === 'activate' ? 'Kích hoạt tài khoản' : 'Xác minh email';
  if (done)
    return (
      <Success
        title="Hoàn tất!"
        description={
          mode === 'verify'
            ? 'Email đã được xác minh. Bạn có thể đăng nhập vào ETM.'
            : 'Mật khẩu đã được lưu. Hãy đăng nhập bằng mật khẩu mới.'
        }
      />
    );
  return (
    <>
      <ShieldCheck className="accent" size={32} />
      <h1>{title}</h1>
      <p className="muted">
        {mode === 'verify'
          ? 'Xác nhận địa chỉ email của bạn để bắt đầu.'
          : 'Thiết lập mật khẩu để bảo vệ tài khoản của bạn.'}
      </p>
      <Alert>{!token ? 'Liên kết thiếu mã xác thực. Hãy mở đầy đủ liên kết từ email.' : error}</Alert>
      <form
        noValidate
        onSubmit={handleSubmit(async (v) => {
          setError('');
          try {
            if (mode === 'verify') await authApi.verifyEmail(token);
            else if (mode === 'activate') await authApi.activate(token, v.password);
            else await authApi.resetPassword(token, v.password);
            setDone(true);
          } catch (e) {
            setError((e as Error).message);
          }
        })}
      >
        {mode !== 'verify' && (
          <>
            <PasswordField
              label="Mật khẩu mới"
              autoComplete="new-password"
              hint="Ít nhất 8 ký tự, gồm chữ, số và ký tự đặc biệt."
              {...register('password', passwordRule)}
              error={errors.password?.message}
            />
            <PasswordField
              label="Xác nhận mật khẩu"
              autoComplete="new-password"
              {...register('confirm', {
                validate: (v) => v === getValues('password') || 'Mật khẩu xác nhận không khớp.',
              })}
              error={errors.confirm?.message}
            />
          </>
        )}
        <Button className="full" type="submit" busy={isSubmitting} disabled={!token}>
          {title}
        </Button>
      </form>
    </>
  );
}
export function OAuthCallbackPage() {
  const { status, user, error, reload } = useAuth();
  if (user) return <Navigate to={homeFor(user)} replace />;
  if (status === 'loading') return <Spinner />;
  return (
    <>
      <h1>Đăng nhập Google</h1>
      <Alert>{error || 'Không nhận được phiên đăng nhập hợp lệ. Vui lòng thử đăng nhập lại.'}</Alert>
      {status === 'error' && (
        <Button
          onClick={() => {
            void reload().catch(() => undefined);
          }}
        >
          Thử lại
        </Button>
      )}
      <Link to="/login">Về đăng nhập</Link>
    </>
  );
}
