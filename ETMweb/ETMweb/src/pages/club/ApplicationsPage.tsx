import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type FieldValues } from 'react-hook-form';
import { useClub } from './ClubScope';
import { managementApi, save } from '../../services/management';
import { competitionApi } from '../../services/competition';
import { Alert, Button, PageHeading, QueryError, Spinner, Table } from '../../components/ui';
import { Empty, Status } from '../../components/management';
import { DocumentUpload } from '../../components/DocumentUpload';
import { gameName, refId, type Tournament } from '../../types/management';
import { formatDate } from '../../utils/account';
import { registrationState } from '../../utils/tournament';
export function ApplicationsPage() {
  const club = useClub();
  const query = useQuery({ queryKey: ['cm', 'applications', club._id], queryFn: managementApi.applications });
  return (
    <>
      <PageHeading
        title="Hồ sơ đăng ký giải"
        action={
          <Link className="button primary" to="/cm/applications/new">
            Đăng ký giải đấu
          </Link>
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
                <th>Giải đấu</th>
                <th>Team</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data
                .filter((a) => a.teamId?.clubId === club._id)
                .map((a) => (
                  <tr key={a._id}>
                    <td>{typeof a.tournamentId === 'object' ? a.tournamentId.name : 'Giải đấu'}</td>
                    <td>{a.teamId?.name}</td>
                    <td>
                      <Status value={a.status} />
                    </td>
                    <td>
                      <Link to={`/cm/applications/${a._id}`}>Chi tiết hồ sơ →</Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
          {!query.data.some((a) => a.teamId?.clubId === club._id) && <Empty />}
        </section>
      )}
    </>
  );
}
export function ApplicationFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const selectedTournamentId = params.get('tournamentId') || '';
  const query = useQuery({
    queryKey: ['application', id],
    queryFn: () => competitionApi.application(id!),
    enabled: !!id,
  });
  if (id && query.isPending) return <Spinner />;
  if (id && query.isError)
    return (
      <QueryError
        message={query.error.message}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  if (query.data && !['Draft', 'NeedMoreInfo'].includes(query.data.application.status))
    return <Alert>Hồ sơ hiện tại không còn được phép chỉnh sửa.</Alert>;
  return (
    <ApplicationForm
      key={id || selectedTournamentId || 'new'}
      id={id}
      selectedTournamentId={selectedTournamentId}
      initial={query.data?.application}
    />
  );
}
function ApplicationForm({
  id,
  initial,
  selectedTournamentId,
}: {
  id?: string;
  selectedTournamentId: string;
  initial?: { note?: string; documents: string[] };
}) {
  const club = useClub();
  const form = useForm<FieldValues>({
    defaultValues: { note: initial?.note || '', teamId: '', tournamentId: selectedTournamentId },
  });
  const [documents, setDocuments] = useState<string[]>(initial?.documents || []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const created = useRef('');
  const navigate = useNavigate();
  const client = useQueryClient();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => form.setValue('teamId', ''), [club._id, form]);
  const tournaments = useQuery({
    queryKey: ['open-registration'],
    queryFn: competitionApi.openTournaments,
    enabled: !id,
    refetchInterval: 30000,
  });
  const teams = useQuery({
    queryKey: ['cm', club._id, 'teams'],
    queryFn: () => managementApi.teams(club._id),
    enabled: !id,
  });
  const chosen = tournaments.data?.find((t) => t._id === form.watch('tournamentId'));
  const available = tournaments.data?.filter((t) => Date.parse(t.registrationCloseAt) > now) || [];
  const state = chosen ? registrationState(chosen, now) : null;
  const compatible =
    teams.data?.filter((t) => t.status === 'Active' && refId(t.gameId) === refId(chosen?.gameId)) || [];
  return (
    <>
      <PageHeading title={id ? 'Bổ sung hồ sơ' : 'Đăng ký giải đấu'} />
      <section className="panel narrow">
        <Alert>{error}</Alert>
        {(tournaments.isError || teams.isError) && (
          <QueryError
            message={tournaments.error?.message || teams.error?.message || 'Lỗi dữ liệu'}
            retry={() => {
              void tournaments.refetch();
              void teams.refetch();
            }}
          />
        )}
        <form
          onSubmit={form.handleSubmit(async (v) => {
            if (uploading) return;
            if (!id && (!chosen || state !== 'open')) {
              setError('Giải đấu chưa mở hoặc đã đóng đăng ký. Kiểm tra thời gian nhận hồ sơ.');
              return;
            }
            setError('');
            try {
              let target = id || created.current;
              if (!target) {
                const response = await save<{ application: { _id: string } }>('/applications', {
                  tournamentId: v.tournamentId,
                  teamId: v.teamId,
                  note: v.note,
                });
                target = response.data.application._id;
                created.current = target;
              }
              await save(`/applications/${target}`, { note: v.note, documents }, 'put');
              await client.invalidateQueries();
              navigate(`/cm/applications/${target}`);
            } catch (e) {
              setError(
                `${created.current ? 'Bản nháp đã tạo; thử lưu lại để bổ sung tài liệu. ' : ''}${(e as Error).message}`,
              );
            }
          })}
        >
          {!id && (
            <>
              <div className="field">
                <label htmlFor="apply-tournament">Giải đấu mở đăng ký</label>
                <select
                  id="apply-tournament"
                  value={form.watch('tournamentId') || ''}
                  disabled={!!created.current}
                  {...form.register('tournamentId', {
                    required: true,
                    onChange: () => form.setValue('teamId', ''),
                  })}
                >
                  <option value="">Chọn giải đấu</option>
                  {available.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                      {registrationState(t, now) === 'upcoming'
                        ? ` — Mở lúc ${formatDate(t.registrationOpenAt, true)}`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>
              {chosen && (
                <Alert kind="info">
                  <strong className="block">Game: {gameName(chosen.gameId)}</strong>
                  Nhận hồ sơ từ {formatDate(chosen.registrationOpenAt, true)} đến{' '}
                  {formatDate(chosen.registrationCloseAt, true)}.
                  {state === 'upcoming'
                    ? ' Giải đã công bố nhưng chưa đến giờ mở đăng ký.'
                    : state === 'closed'
                      ? ' Đã đóng đăng ký.'
                      : ''}
                </Alert>
              )}
              {!tournaments.isPending && !tournaments.isError && available.length === 0 && (
                <Alert kind="info">
                  Chưa có giải đang hoặc sắp mở đăng ký. Việc đăng bài tin tức không tự công bố giải đấu.
                </Alert>
              )}
              {selectedTournamentId && !tournaments.isPending && !chosen && (
                <Alert kind="info">Giải được chọn hiện không nhận hồ sơ. Vui lòng chọn một giải khác.</Alert>
              )}
              <div className="field">
                <label htmlFor="apply-team">Team cùng game</label>
                <select
                  id="apply-team"
                  disabled={!chosen || !!created.current}
                  {...form.register('teamId', { required: true })}
                >
                  <option value="">Chọn team tương thích</option>
                  {compatible.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} — {gameName(t.gameId)}
                    </option>
                  ))}
                </select>
                <small className="muted">
                  {chosen
                    ? `Chỉ hiển thị đội ${gameName(chosen.gameId)} đang hoạt động của ${club.name}.`
                    : 'Chọn giải đấu để xem đội phù hợp với game.'}
                </small>
                {chosen && !teams.isPending && !teams.isError && !compatible.length && (
                  <p className="muted small">
                    CLB hiện chưa có đội đang hoạt động cho game của giải này.{' '}
                    <Link to="/cm/teams">Quản lý đội tuyển →</Link>
                  </p>
                )}
              </div>
              {(form.formState.errors.teamId || form.formState.errors.tournamentId) && (
                <Alert>Chọn đầy đủ giải đấu và team phù hợp.</Alert>
              )}
            </>
          )}
          <div className="field">
            <label htmlFor="application-note">Thông tin bổ sung</label>
            <textarea id="application-note" {...form.register('note')} />
          </div>
          <DocumentUpload
            scope="application"
            entityId={id || created.current || undefined}
            value={documents}
            onChange={setDocuments}
            onBusy={setUploading}
          />
          <div className="form-actions">
            <Link className="button secondary" to="/cm/applications">
              Hủy
            </Link>
            <Button
              type="submit"
              busy={form.formState.isSubmitting}
              disabled={
                uploading ||
                (!id &&
                  (teams.isPending ||
                    tournaments.isPending ||
                    teams.isError ||
                    tournaments.isError ||
                    !chosen ||
                    state !== 'open' ||
                    !compatible.length))
              }
            >
              Lưu bản nháp
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}
