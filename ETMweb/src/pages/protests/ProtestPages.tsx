import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { communityApi } from '../../services/community';
import { managementApi, save } from '../../services/management';
import { api } from '../../services/api';
import { Alert, Button, PageHeading, Pagination, QueryError, Spinner, Table } from '../../components/ui';
import { ConfirmAction, DataForm, Empty, Status } from '../../components/management';
import { DocumentLinks, DocumentUpload } from '../../components/DocumentUpload';
import { formatDate } from '../../utils/account';
import { refId } from '../../types/management';
import { validScore } from '../../utils/competition';
export function ProtestsPage({ organizer = false }: { organizer?: boolean }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const query = useQuery({
    queryKey: ['protests', organizer, page, status],
    queryFn: () => communityApi.protests(organizer, { page, limit: 10, status: status || undefined }),
  });
  return (
    <>
      <PageHeading
        title={organizer ? 'Xử lý khiếu nại' : 'Khiếu nại của CLB'}
        action={
          !organizer ? (
            <Link className="button primary" to="/cm/protests/new">
              Gửi khiếu nại
            </Link>
          ) : undefined
        }
      />
      <div className="filters">
        <select
          aria-label="Lọc khiếu nại"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {['Submitted', 'NeedMoreInfo', 'Resolved', 'Withdrawn'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
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
                <th>CLB / Giải</th>
                <th>Nội dung</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((p) => (
                <tr key={p._id}>
                  <td>
                    {p.clubId?.name}
                    <small className="block muted">{p.tournamentId?.name}</small>
                  </td>
                  <td className="wrap-cell">{p.category}</td>
                  <td>
                    <Status value={p.status} />
                  </td>
                  <td>
                    <Link to={`/${organizer ? 'to' : 'cm'}/protests/${p._id}`}>Chi tiết khiếu nại →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!query.data.data.length && <Empty />}
          <Pagination
            label="khiếu nại"
            page={page}
            limit={10}
            total={query.data.pagination?.total || 0}
            onChange={setPage}
          />
        </section>
      )}
    </>
  );
}
export function CreateProtestPage() {
  const clubs = useQuery({ queryKey: ['cm', 'clubs'], queryFn: managementApi.clubs });
  const [club, setClub] = useState('');
  const clubId = club || clubs.data?.[0]?._id || '';
  const query = useQuery({
    queryKey: ['protest-candidates', clubId],
    queryFn: () => communityApi.eligible(clubId),
    enabled: !!clubId,
  });
  const [match, setMatch] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [documents, setDocuments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const candidate = query.data?.find((c) => c.match._id === match);
  const label = (team: unknown) =>
    typeof team === 'object' && team && 'name' in team ? String(team.name) : 'TBD';
  return (
    <>
      <PageHeading
        title="Gửi khiếu nại trận đấu"
        description="Chỉ CLB tham gia trận có kết quả chính thức và còn trong hạn khiếu nại mới được gửi."
      />
      <section className="panel narrow">
        <Alert>{error}</Alert>
        {clubs.isError && (
          <QueryError
            message={clubs.error.message}
            retry={() => {
              void clubs.refetch();
            }}
          />
        )}
        {query.isError && (
          <QueryError
            message={query.error.message}
            retry={() => {
              void query.refetch();
            }}
          />
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (uploading) return;
            setError('');
            if (!candidate || Date.now() >= Date.parse(candidate.deadline)) {
              setError('Chọn trận còn hạn khiếu nại.');
              return;
            }
            if (!description.trim() || !category.trim()) {
              setError('Nhập lý do và nội dung khiếu nại.');
              return;
            }
            setBusy(true);
            try {
              const r = await save<{ _id: string }>('/protests', {
                clubId,
                matchId: match,
                category,
                description,
                evidenceUrls: documents,
              });
              navigate(`/cm/protests/${r.data._id}`);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="field">
            <label htmlFor="protest-club">CLB gửi khiếu nại</label>
            <select
              id="protest-club"
              value={clubId}
              onChange={(e) => {
                setClub(e.target.value);
                setMatch('');
              }}
            >
              {clubs.data?.map((c) => (
                <option value={c._id} key={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="protest-match">Trận đấu có kết quả chính thức</label>
            <select id="protest-match" required value={match} onChange={(e) => setMatch(e.target.value)}>
              <option value="">Chọn trận đấu</option>
              {query.data?.map((c) => (
                <option key={c.match._id} value={c.match._id}>
                  {c.match.tournamentId.name} · {label(c.match.teamAId)} — {label(c.match.teamBId)}
                </option>
              ))}
            </select>
            {query.isFetching && <small>Đang kiểm tra các trận đủ điều kiện…</small>}
            {query.data?.length === 0 && <small>Không có trận còn hạn của CLB này.</small>}
          </div>
          {candidate && (
            <Alert kind="info">
              Hạn khiếu nại: {formatDate(candidate.deadline, true)} · Kết quả {candidate.result.teamAScore} :{' '}
              {candidate.result.teamBScore}
            </Alert>
          )}
          <div className="field">
            <label htmlFor="protest-category">Loại khiếu nại</label>
            <input
              id="protest-category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="protest-description">Nội dung khiếu nại</label>
            <textarea
              id="protest-description"
              required
              maxLength={10000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DocumentUpload scope="protest" value={documents} onChange={setDocuments} onBusy={setUploading} />
          <Button type="submit" busy={busy} disabled={uploading || !candidate}>
            Gửi khiếu nại
          </Button>
        </form>
      </section>
    </>
  );
}
export function ProtestDetailPage({ organizer = false }: { organizer?: boolean }) {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['protest', id], queryFn: () => communityApi.protest(id) });
  const [action, setAction] = useState('');
  if (query.isPending) return <Spinner />;
  if (query.isError)
    return (
      <QueryError
        message={query.error.message}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const p = query.data;
  const open = ['Submitted', 'NeedMoreInfo'].includes(p.status);
  const label = (team: typeof p.matchId.teamAId) => (typeof team === 'object' ? team?.name || 'TBD' : 'TBD');
  return (
    <>
      <Link to={`/${organizer ? 'to' : 'cm'}/protests`}>← Danh sách khiếu nại</Link>
      <PageHeading
        title={p.category}
        description={`${p.tournamentId?.name} · ${p.clubId?.name}`}
        action={
          <div className="row-actions">
            {open &&
              (organizer ? (
                <>
                  <Button variant="secondary" onClick={() => setAction('request-more')}>
                    Yêu cầu bằng chứng
                  </Button>
                  <Button onClick={() => setAction('resolve')}>Ra quyết định</Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setAction('edit')}>Bổ sung bằng chứng</Button>
                  <Button variant="danger" onClick={() => setAction('withdraw')}>
                    Rút khiếu nại
                  </Button>
                </>
              ))}
          </div>
        }
      />
      <Status value={p.status} />
      <div className="dashboard-grid spaced">
        <section className="panel">
          <h2>
            {label(p.matchId?.teamAId)} — {label(p.matchId?.teamBId)}
          </h2>
          <p className="prose">{p.description}</p>
          <p className="muted small">Hạn nộp khiếu nại: {formatDate(p.deadline, true)}</p>
          <DocumentLinks urls={p.evidenceUrls} />
          {p.decision && (
            <>
              <h3 className="spaced">Quyết định · {p.decision === 'Accepted' ? 'Chấp nhận' : 'Từ chối'}</h3>
              <p className="prose">{p.explanation}</p>
            </>
          )}
        </section>
        <section className="panel">
          <h2>Tiến trình xử lý</h2>
          <ol className="timeline">
            {p.timeline.map((t) => (
              <li key={t._id}>
                <strong>{t.action}</strong>
                <span>
                  {formatDate(t.at, true)} · {t.actorId?.fullName || 'Tài khoản hệ thống'}
                </span>
                {t.note && <p>{t.note}</p>}
              </li>
            ))}
          </ol>
        </section>
      </div>
      {action === 'withdraw' && (
        <ConfirmAction
          title="Rút khiếu nại?"
          description="Khiếu nại sẽ kết thúc ở trạng thái đã rút."
          onClose={() => setAction('')}
          action={() => api.delete(`/protests/${id}/withdraw`)}
        />
      )}
      {action === 'edit' && (
        <ProtestSupplement
          id={id}
          description={p.description}
          documents={p.evidenceUrls}
          onClose={() => setAction('')}
        />
      )}
      {action === 'request-more' && (
        <DataForm
          title="Yêu cầu bổ sung bằng chứng"
          onClose={() => setAction('')}
          fields={[{ name: 'explanation', label: 'Nội dung yêu cầu', type: 'textarea', required: true }]}
          submit={async (v) => {
            await save(`/protests/${id}/request-more`, v, 'put');
          }}
        />
      )}
      {action === 'resolve' && (
        <DataForm
          title="Quyết định khiếu nại"
          onClose={() => setAction('')}
          defaults={{ decision: 'Rejected', correctScore: false, teamAScore: 0, teamBScore: 0 }}
          fields={[
            {
              name: 'decision',
              label: 'Quyết định',
              options: [
                { value: 'Accepted', label: 'Chấp nhận' },
                { value: 'Rejected', label: 'Từ chối' },
              ],
            },
            { name: 'explanation', label: 'Giải thích quyết định', type: 'textarea', required: true },
          ]}
          submit={async (v) => {
            const result =
              v.decision === 'Accepted' && v.correctScore
                ? { teamAScore: Number(v.teamAScore), teamBScore: Number(v.teamBScore) }
                : undefined;
            if (result && !validScore(result.teamAScore, result.teamBScore, p.matchId.bestOf, true))
              throw new Error('Tỉ số chỉnh sửa chưa phù hợp BO của trận.');
            await save(
              `/protests/${id}/resolve`,
              { decision: v.decision, explanation: v.explanation, result },
              'put',
            );
          }}
        >
          {(form) =>
            form.watch('decision') === 'Accepted' ? (
              <>
                <label className="checkbox-row">
                  <input type="checkbox" {...form.register('correctScore')} />
                  Điều chỉnh tỉ số chính thức
                </label>
                {form.watch('correctScore') && (
                  <div className="score-fields">
                    {([
                      ['teamAScore', p.matchId?.teamAId],
                      ['teamBScore', p.matchId?.teamBId],
                    ] as const).map(([key, team]) => (
                      <div className="field" key={key}>
                        <label htmlFor={`resolve-${key}`}>Tỉ số {label(team)}</label>
                        <input
                          id={`resolve-${key}`}
                          type="number"
                          min={0}
                          step={1}
                          required
                          {...form.register(key, { valueAsNumber: true })}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <p className="muted small">
                  Điều chỉnh tỉ số sẽ cập nhật audit, nhánh đấu, xếp hạng và điểm Pick’em. Trận đã có kết quả
                  vòng sau có thể hạn chế việc đổi đội thắng.
                </p>
              </>
            ) : null
          }
        </DataForm>
      )}
    </>
  );
}
function ProtestSupplement({
  id,
  description,
  documents: initial,
  onClose,
}: {
  id: string;
  description: string;
  documents: string[];
  onClose: () => void;
}) {
  const [value, setValue] = useState(description);
  const [documents, setDocuments] = useState(initial);
  const [uploading, setUploading] = useState(false);
  return (
    <DataForm
      title="Bổ sung khiếu nại"
      onClose={onClose}
      fields={[]}
      submit={async () => {
        if (uploading) throw new Error('Chờ tải bằng chứng hoàn tất.');
        if (!value.trim()) throw new Error('Nhập nội dung khiếu nại.');
        await save(`/protests/${id}`, { description: value, evidenceUrls: documents }, 'put');
      }}
    >
      {(form) => (
        <>
          <div className="field">
            <label htmlFor="supplement-description">Nội dung bổ sung</label>
            <textarea
              id="supplement-description"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <DocumentUpload
            scope="protest"
            entityId={id}
            value={documents}
            onChange={setDocuments}
            onBusy={(busy) => {
              setUploading(busy);
              form.setValue('_uploading', busy);
            }}
          />
        </>
      )}
    </DataForm>
  );
}
