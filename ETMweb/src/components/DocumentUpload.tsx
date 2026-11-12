import { useState } from 'react';
import { Alert, Button } from './ui';
import { managementApi } from '../services/management';
import { isVideoUrl, safeDocumentUrl, validDocument } from '../utils/competition';
export function DocumentLinks({ urls }: { urls: string[] }) {
  return (
    <ul className="document-links">
      {urls.map((url, i) => (
        <li key={url}>
          {safeDocumentUrl(url) ? (
            <>
              {isVideoUrl(url) && <video className="media-preview" controls preload="metadata" src={url} />}
              <a href={url} target="_blank" rel="noopener noreferrer">
                Tài liệu {i + 1} ↗
              </a>
            </>
          ) : (
            <span>Đường dẫn tài liệu không hợp lệ</span>
          )}
        </li>
      ))}
    </ul>
  );
}
export function DocumentUpload({
  value,
  onChange,
  onBusy,
  scope = 'document',
  entityId,
  assetName,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  onBusy: (busy: boolean) => void;
  scope?: string;
  entityId?: string;
  assetName?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="document-upload">
      <label className="button secondary">
        {busy ? 'Đang tải tài liệu…' : 'Chọn tài liệu'}
        <input
          className="sr-only"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.mp4,.webm,.mov"
          aria-label="Tải tài liệu"
          disabled={busy}
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            e.target.value = '';
            if (!files.length) return;
            if (value.length + files.length > 10) {
              setError('Tối đa 10 tài liệu.');
              return;
            }
            const invalid = files.map(validDocument).find(Boolean);
            if (invalid) {
              setError(invalid);
              return;
            }
            setBusy(true);
            onBusy(true);
            setError('');
            const next = [...value];
            try {
              for (const file of files) {
                next.push(await managementApi.upload(file, scope, undefined, { entityId, assetName }));
                onChange([...next]);
              }
            } catch (e) {
              setError(`Các file tải thành công được giữ lại. ${(e as Error).message}`);
            } finally {
              setBusy(false);
              onBusy(false);
            }
          }}
        />
      </label>
      <p className="muted small">Tối đa 10 file · ảnh/PDF/Word 10 MB, video MP4/WebM/MOV 50 MB</p>
      <Alert>{error}</Alert>
      <DocumentLinks urls={value} />
      {value.map((url, i) => (
        <Button
          key={url}
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => onChange(value.filter((_, index) => index !== i))}
        >
          Bỏ tài liệu {i + 1}
        </Button>
      ))}
    </div>
  );
}
