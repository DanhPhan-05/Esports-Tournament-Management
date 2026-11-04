import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { managementApi, save } from '../services/management';
import { Alert, Button, Modal } from './ui';
import { DocumentUpload } from './DocumentUpload';

export function ReportViolation({
  matchId,
  clubIds,
  context,
  eligible = true,
}: {
  matchId: string;
  clubIds: string[];
  context: string;
  eligible?: boolean;
}) {
  const { user } = useAuth();
  const clubs = useQuery({
    queryKey: ['report-clubs', user?._id],
    queryFn: managementApi.clubs,
    enabled: user?.systemRole === 'ClubManager' && eligible,
  });
  const [open, setOpen] = useState(false),
    [error, setError] = useState(''),
    [category, setCategory] = useState(''),
    [description, setDescription] = useState('');
  const [documents, setDocuments] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [reportId, setReportId] = useState('');
  if (
    user?.systemRole !== 'ClubManager' ||
    !eligible ||
    !clubs.data?.some((club) => clubIds.includes(club._id))
  )
    return null;
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Báo cáo trận đấu
      </Button>
      {open && (
        <Modal title="Báo cáo trận đấu" onClose={() => setOpen(false)}>
          <p className="muted small">{context}</p>
          {reportId ? (
            <>
              <Alert kind="success">Báo cáo đã được gửi.</Alert>
              <Link to={`/reports/${reportId}`}>Theo dõi báo cáo →</Link>
            </>
          ) : (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (uploading) return;
                setError('');
                if (!description.trim() || !category) {
                  setError('Chọn loại báo cáo và nhập mô tả.');
                  return;
                }
                setBusy(true);
                try {
                  const response = await save<{ _id: string }>('/reports', {
                    targetType: 'Match',
                    targetId: matchId,
                    category,
                    description,
                    evidenceUrls: documents,
                  });
                  setReportId(response.data._id);
                } catch (error) {
                  setError((error as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Alert>{error}</Alert>
              <div className="field">
                <label htmlFor="violation-category">Loại báo cáo</label>
                <select
                  id="violation-category"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Chọn nội dung báo cáo</option>
                  <option>Kết quả trận đấu</option>
                  <option>Vi phạm luật thi đấu</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="violation-description">Mô tả vi phạm</label>
                <textarea
                  id="violation-description"
                  required
                  maxLength={10000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <DocumentUpload
                scope="report"
                value={documents}
                onChange={setDocuments}
                onBusy={setUploading}
              />
              <Button type="submit" busy={busy} disabled={uploading}>
                Gửi báo cáo
              </Button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
