import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, type FieldValues, type UseFormRegister, type FieldErrors } from 'react-hook-form';
import { Alert, Button, Modal } from './ui';
import { managementApi } from '../services/management';
import { validateImage, validateVideo } from '../utils/validation';
import { statusLabel } from '../utils/management';
export function Status({ value }: { value: string }) {
  return <span className={`badge ${value.toLowerCase()}`}>{statusLabel[value] || value}</span>;
}
export function Empty({ children = 'Chưa có dữ liệu.' }: { children?: ReactNode }) {
  return <p className="empty muted">{children}</p>;
}
export function Fields({
  register,
  errors,
  fields,
}: {
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors;
  fields: {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    options?: { value: string; label: string; group?: string }[];
    disabled?: boolean;
    suggestions?: string[];
  }[];
}) {
  return (
    <>
      {fields.map((f) => (
        <div className="field" key={f.name}>
          <label htmlFor={f.name}>
            {f.label}
            {f.required && <span aria-hidden="true"> *</span>}
          </label>
          {f.options ? (
            <select
              id={f.name}
              aria-required={f.required}
              disabled={f.disabled}
              {...register(f.name, { required: f.required ? 'Thông tin bắt buộc.' : false })}
            >
              {f.options
                .filter((o) => !o.group)
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              {[...new Set(f.options.map((o) => o.group).filter(Boolean))].map((group) => (
                <optgroup key={group} label={group!}>
                  {f
                    .options!.filter((o) => o.group === group)
                    .map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea
              id={f.name}
              rows={4}
              aria-required={f.required}
              {...register(f.name, { required: f.required ? 'Thông tin bắt buộc.' : false })}
            />
          ) : (
            <input
              id={f.name}
              list={f.suggestions ? `${f.name}-suggestions` : undefined}
              disabled={f.disabled}
              type={f.type || 'text'}
              aria-required={f.required}
              {...register(f.name, {
                required: f.required ? 'Thông tin bắt buộc.' : false,
                ...(f.type === 'number'
                  ? { valueAsNumber: true, min: { value: 1, message: 'Giá trị phải lớn hơn 0.' } }
                  : {}),
              })}
            />
          )}
          {f.suggestions && (
            <datalist id={`${f.name}-suggestions`}>
              {f.suggestions.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          )}
          <small className="field-error">{errors[f.name]?.message as string}</small>
        </div>
      ))}
    </>
  );
}
export function DataForm({
  title,
  defaults,
  fields,
  submit,
  onClose,
  children,
}: {
  title: string;
  defaults?: FieldValues;
  fields: Parameters<typeof Fields>[0]['fields'];
  submit: (values: FieldValues) => Promise<string | void>;
  onClose: () => void;
  children?: (form: ReturnType<typeof useForm>) => ReactNode;
}) {
  const form = useForm({ defaultValues: defaults });
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const client = useQueryClient();
  return (
    <Modal title={title} onClose={onClose}>
      <Alert>{error}</Alert>
      {warning ? (
        <>
          <Alert kind="info">Đã lưu. {warning}</Alert>
          <Button onClick={onClose}>Đã hiểu</Button>
        </>
      ) : (
        <form
          onSubmit={form.handleSubmit(async (v) => {
            setError('');
            try {
              const { _uploading, ...input } = v;
              if (_uploading) return;
              const note = await submit(input);
              await client.invalidateQueries();
              if (note) setWarning(note);
              else onClose();
            } catch (e) {
              setError((e as Error).message);
            }
          })}
        >
          <Fields register={form.register} errors={form.formState.errors} fields={fields} />
          {children?.(form)}
          <div className="form-actions">
            <Button
              variant="secondary"
              type="button"
              onClick={onClose}
              disabled={form.formState.isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" busy={form.formState.isSubmitting} disabled={!!form.watch('_uploading')}>
              Lưu
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
export function ConfirmAction({
  title,
  description,
  action,
  onClose,
  reason = false,
}: {
  title: string;
  description: string;
  action: (reason: string) => Promise<unknown>;
  onClose: () => void;
  reason?: boolean;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  return (
    <Modal title={title} onClose={onClose}>
      <p>{description}</p>
      <Alert>{error}</Alert>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await action(value);
            await client.invalidateQueries();
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {reason && (
          <div className="field">
            <label htmlFor="action-reason">Lý do</label>
            <textarea id="action-reason" required value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
        )}
        <div className="form-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" busy={busy}>
            Xác nhận
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function ImageUpload({
  value,
  onChange,
  scope,
  clubId,
  entityId,
  assetName,
  onBusy,
  kind = 'image',
  disabled = false,
}: {
  value?: string;
  onChange: (url: string) => void;
  scope?: string;
  clubId?: string;
  entityId?: string;
  assetName?: string;
  onBusy?: (busy: boolean) => void;
  kind?: 'image' | 'video';
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  return (
    <div className="image-upload">
      {(preview || value) &&
        (kind === 'video' ? (
          <video className="media-preview" controls preload="metadata" src={preview || value} />
        ) : (
          <img src={preview || value} alt="Ảnh xem trước" />
        ))}
      <label className="button secondary">
        {busy
          ? kind === 'video'
            ? 'Đang tải video…'
            : 'Đang tải ảnh…'
          : kind === 'video'
            ? 'Chọn video'
            : 'Chọn ảnh'}
        <input
          className="sr-only"
          aria-label={kind === 'video' ? 'Tải video' : 'Tải ảnh'}
          type="file"
          accept={
            kind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/png,image/jpeg,image/webp'
          }
          disabled={busy || disabled}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            const invalid = kind === 'video' ? validateVideo(file) : validateImage(file);
            if (invalid) {
              setError(invalid);
              return;
            }
            setError('');
            setBusy(true);
            onBusy?.(true);
            setPreview(URL.createObjectURL(file));
            try {
              onChange(await managementApi.upload(file, scope || kind, clubId, { entityId, assetName }));
            } catch (e) {
              setError((e as Error).message);
              setPreview('');
            } finally {
              setBusy(false);
              onBusy?.(false);
            }
          }}
        />
      </label>
      <p className="muted small">
        {kind === 'video' ? 'MP4, WebM, MOV · tối đa 50 MB' : 'PNG, JPEG, WebP · tối đa 10 MB'}
      </p>
      <Alert>{error}</Alert>
    </div>
  );
}
