import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { Eye, EyeOff, X, LoaderCircle } from 'lucide-react';
import { initials, statusNames } from '../utils/account';
import type { AccountStatus } from '../types';

export function Button({
  children,
  variant = 'primary',
  busy,
  className = '',
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      className={`button ${variant} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy}
    >
      {busy && <LoaderCircle size={16} className="spin" />}
      {children}
    </button>
  );
}
export function Input({
  label,
  error,
  hint,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const inputId = id || props.name;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input
        {...props}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${inputId}-help` : undefined}
      />
      {(error || hint) && (
        <small id={`${inputId}-help`} className={error ? 'field-error' : 'muted'}>
          {error || hint}
        </small>
      )}
    </div>
  );
}
export function PasswordField(props: Parameters<typeof Input>[0]) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <Input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="password-toggle icon-button"
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        onClick={() => setVisible(!visible)}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
export function Alert({
  children,
  kind = 'error',
}: {
  children?: ReactNode;
  kind?: 'error' | 'success' | 'info';
}) {
  return children ? (
    <div className={`alert ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  ) : null;
}
export function Spinner({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={25} />
      <span>{label}</span>
    </div>
  );
}
export function Badge({ status }: { status: AccountStatus }) {
  return (
    <span className={`badge ${status.toLowerCase()}`}>
      <span />
      {statusNames[status]}
    </span>
  );
}
export function Avatar({
  name,
  url,
  large = false,
  fit = 'cover',
}: {
  name: string;
  url?: string;
  large?: boolean;
  fit?: 'cover' | 'contain';
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return (
    <span className={`avatar ${large ? 'large' : ''} ${fit === 'contain' ? 'fit-contain' : ''}`}>
      {url && !failed ? <img src={url} alt={name} onError={() => setFailed(true)} /> : initials(name)}
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Đóng">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="table-scroll">
      <table>{children}</table>
    </div>
  );
}
export function Pagination({
  page,
  total,
  limit,
  onChange,
  label = 'tài khoản',
}: {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <nav className="pagination" aria-label="Phân trang">
      <span>
        {total
          ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} / ${total} ${label}`
          : `0 ${label}`}
      </span>
      <div>
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Trước
        </Button>
        <span>
          {page} / {pages}
        </span>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Sau
        </Button>
      </div>
    </nav>
  );
}
export function QueryError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="empty">
      <Alert>{message}</Alert>
      <Button variant="secondary" onClick={retry}>
        Thử lại
      </Button>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
