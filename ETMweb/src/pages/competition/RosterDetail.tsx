import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { competitionApi } from '../../services/competition';
import { save } from '../../services/management';
import { Alert, Button, PageHeading, QueryError, Spinner, Table } from '../../components/ui';
import { ConfirmAction, Empty } from '../../components/management';
import { Modal } from '../../components/ui';
import { Status } from '../../components/management';
import { useCountdown } from '../../hooks/useCountdown';
import { eligibleMember } from '../../utils/competition';
import { formatDate } from '../../utils/account';
import { refId, type Member, type Tournament } from '../../types/management';
import type { Entry, Roster } from '../../types/competition';
export function RosterDetailPage({ review = false }: { review?: boolean }) {
  const params = useParams();
  const id = params.rosterId || params.id || '';
  const query = useQuery({
    queryKey: ['roster-detail', id],
    queryFn: async () => {
      const roster = await competitionApi.roster(id);
      const detail = await competitionApi.application(roster.applicationId);
      return { ...detail, roster };
    },
  });
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
  return (
    <RosterEditor
      key={id}
      roster={query.data.roster!}
      tournament={query.data.application.tournamentId}
      clubId={query.data.application.teamId.clubId}
      review={review}
      applicationStatus={query.data.application.status}
    />
  );
}
function RosterEditor({
  roster,
  tournament,
  clubId,
  review,
  applicationStatus,
}: {
  roster: Roster;
  tournament: Tournament;
  clubId: string;
  review: boolean;
  applicationStatus: string;
}) {
  const countdown = useCountdown(tournament.rosterLockAt);
  const [entries, setEntries] = useState<{ clubMemberId: string; role: string }[]>(
    roster.entries.map((e) => ({ clubMemberId: refId(e.clubMemberId), role: e.role })),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState('');
  const [emergency, setEmergency] = useState(false);
  const client = useQueryClient();
  const members = useQuery({
    queryKey: ['roster-options', clubId, roster.teamId],
    queryFn: () => competitionApi.allMembers(clubId, roster.teamId),
    enabled: !review,
  });
  const changes = useQuery({
    queryKey: ['roster-changes', roster._id],
    queryFn: () => competitionApi.changes(roster._id),
  });
  const locked = countdown.locked || ['Approved', 'Locked'].includes(roster.status);
  const displayMembers = review
    ? roster.entries
        .map((e) => (typeof e.clubMemberId === 'object' ? e.clubMemberId : null))
        .filter((m): m is Member => !!m)
    : members.data || [];
  const shown = [
    ...displayMembers,
    ...roster.entries
      .map((e) => (typeof e.clubMemberId === 'object' ? e.clubMemberId : null))
      .filter((m): m is Member => !!m),
  ].filter((m, i, all) => all.findIndex((other) => other._id === m._id) === i);
  return (
    <>
      <PageHeading
        title={review ? 'Xét duyệt roster' : 'Quản lý roster'}
        description={tournament.name}
        action={
          <Link
            className="button secondary"
            to={
              review
                ? `/to/tournaments/${tournament._id}/rosters`
                : `/cm/applications/${roster.applicationId}`
            }
          >
            Hồ sơ liên quan
          </Link>
        }
      />
      <Status value={roster.status} />
      <Alert kind={countdown.locked ? 'info' : 'success'}>
        Khóa roster: {formatDate(tournament.rosterLockAt, true)} · {countdown.label}
      </Alert>
      <Alert>{error}</Alert>
      {roster.rejectionReason && <Alert>Lý do từ chối: {roster.rejectionReason}</Alert>}
      {members.isError && (
        <QueryError
          message={members.error.message}
          retry={() => {
            void members.refetch();
          }}
        />
      )}
      <section className="panel">
        <p className="muted small">
          Roster yêu cầu {tournament.minRosterSize}–{tournament.maxRosterSize} thành viên. Thành viên phải
          hoạt động xuyên suốt thời gian giải. Hệ thống kiểm tra lại tư cách và lệnh cấm khi lưu hoặc duyệt.
        </p>
        {!review && members.isPending ? (
          <Spinner />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Chọn</th>
                <th>Thành viên</th>
                <th>CCCD</th>
                <th>Thời gian hoạt động</th>
                <th>Tư cách thời gian</th>
                <th>Vai trò</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => {
                const selected =
                  review || locked
                    ? roster.entries.find((e) => refId(e.clubMemberId) === m._id)
                    : entries.find((e) => e.clubMemberId === m._id);
                const eligible = eligibleMember(m, tournament) && refId(m.teamId) === roster.teamId;
                return (
                  <tr key={m._id}>
                    <td>
                      <input
                        className="checkbox-input"
                        aria-label={`Chọn ${m.fullName}`}
                        type="checkbox"
                        checked={!!selected}
                        disabled={review || locked || (!eligible && !selected)}
                        onChange={(e) =>
                          setEntries(
                            e.target.checked
                              ? [...entries, { clubMemberId: m._id, role: 'Player' }]
                              : entries.filter((item) => item.clubMemberId !== m._id),
                          )
                        }
                      />
                    </td>
                    <td>
                      {m.fullName}
                      <small className="block muted">{m.inGameName}</small>
                    </td>
                    <td>********{m.citizenIdLast4}</td>
                    <td>
                      {formatDate(m.activeFrom)} –{' '}
                      {m.activeUntil ? formatDate(m.activeUntil) : 'Chưa xác định'}
                    </td>
                    <td>{eligible ? 'Đủ điều kiện thời gian' : 'Cần kiểm tra lại'}</td>
                    <td>
                      {selected ? (
                        <select
                          aria-label={`Vai trò ${m.fullName}`}
                          disabled={review || locked}
                          value={selected.role}
                          onChange={(e) =>
                            setEntries(
                              entries.map((v) =>
                                v.clubMemberId === m._id ? { ...v, role: e.target.value } : v,
                              ),
                            )
                          }
                        >
                          {['Player', 'Captain', 'Substitute'].map((r) => (
                            <option value={r} key={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {!shown.length && <Empty>Chưa có thành viên phù hợp trong team.</Empty>}
        <div className="form-actions">
          {!review && !locked && (
            <Button
              busy={busy}
              onClick={async () => {
                setError('');
                if (entries.length > tournament.maxRosterSize) {
                  setError('Roster vượt số thành viên tối đa.');
                  return;
                }
                setBusy(true);
                try {
                  await save(`/rosters/${roster._id}`, { entries }, 'put');
                  await client.invalidateQueries();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Lưu roster
            </Button>
          )}
          {!review &&
            ['Approved', 'Locked'].includes(roster.status) &&
            !['Completed', 'Cancelled'].includes(tournament.status) && (
              <Button onClick={() => setEmergency(true)}>Yêu cầu thay người khẩn cấp</Button>
            )}
          {review &&
            roster.status === 'Submitted' &&
            ['Submitted', 'UnderReview', 'Approved'].includes(applicationStatus) && (
              <>
                <Button onClick={() => setAction('approve')}>Duyệt roster</Button>
                <Button variant="danger" onClick={() => setAction('reject')}>
                  Từ chối roster
                </Button>
              </>
            )}
        </div>
      </section>
      <section className="panel spaced">
        <h2>Yêu cầu thay người</h2>
        {changes.isPending ? (
          <Spinner />
        ) : changes.isError ? (
          <QueryError
            message={changes.error.message}
            retry={() => {
              void changes.refetch();
            }}
          />
        ) : (
          <>
            {changes.data.map((c) => (
              <article className="notice" key={c._id}>
                <div>
                  <Status value={c.status} />
                  <p>{c.reason}</p>
                  <p className="small">
                    Thêm:{' '}
                    {c.addMemberIds.map((m) => (typeof m === 'object' ? m.fullName : m)).join(', ') || '—'}
                  </p>
                  <p className="small">
                    Bỏ:{' '}
                    {c.removeMemberIds.map((m) => (typeof m === 'object' ? m.fullName : m)).join(', ') || '—'}
                  </p>
                  {c.reviewNote && <p>Ý kiến: {c.reviewNote}</p>}
                </div>
                {review && c.status === 'Pending' && (
                  <div>
                    <Button onClick={() => setAction(`change-approve:${c._id}`)}>Duyệt thay người</Button>
                    <Button variant="ghost" onClick={() => setAction(`change-reject:${c._id}`)}>
                      Từ chối thay người
                    </Button>
                  </div>
                )}
              </article>
            ))}
            {!changes.data.length && <Empty>Chưa có yêu cầu thay người.</Empty>}
          </>
        )}
      </section>
      {action && (
        <ConfirmAction
          title="Xác nhận xét duyệt"
          description="Tư cách và giới hạn roster sẽ được kiểm tra lại trước khi duyệt."
          reason={action.includes('reject')}
          onClose={() => setAction('')}
          action={(reason) =>
            action.startsWith('change-')
              ? save(
                  `/applications/roster-change-requests/${action.split(':')[1]}/review`,
                  {
                    status: action.startsWith('change-approve') ? 'Approved' : 'Rejected',
                    reviewNote: reason,
                  },
                  'patch',
                )
              : save(`/rosters/${roster._id}/${action}`, { reason }, 'put')
          }
        />
      )}
      {emergency && (
        <EmergencyChange
          roster={roster}
          tournament={tournament}
          members={members.data || []}
          onClose={() => setEmergency(false)}
        />
      )}
    </>
  );
}
function EmergencyChange({
  roster,
  tournament,
  members,
  onClose,
}: {
  roster: Roster;
  tournament: Tournament;
  members: Member[];
  onClose: () => void;
}) {
  const [add, setAdd] = useState<string[]>([]);
  const [remove, setRemove] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  return (
    <Modal title="Thay người khẩn cấp" onClose={onClose}>
      <Alert>{error}</Alert>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          if (!add.length && !remove.length) {
            setError('Chọn ít nhất một thay đổi.');
            return;
          }
          const count = roster.entries.length + add.length - remove.length;
          if (count < tournament.minRosterSize || count > tournament.maxRosterSize) {
            setError('Số thành viên sau thay đổi không đáp ứng giới hạn roster.');
            return;
          }
          setBusy(true);
          try {
            await save(`/rosters/${roster._id}/emergency-change`, {
              addMemberIds: add,
              removeMemberIds: remove,
              reason,
            });
            await client.invalidateQueries();
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>Thành viên bổ sung</h3>
        {members
          .filter(
            (m) =>
              !roster.entries.some((e) => refId(e.clubMemberId) === m._id) && eligibleMember(m, tournament),
          )
          .map((m) => (
            <label className="checkbox-row" key={m._id}>
              <input
                type="checkbox"
                checked={add.includes(m._id)}
                onChange={(e) =>
                  setAdd(e.target.checked ? [...add, m._id] : add.filter((id) => id !== m._id))
                }
              />
              Thêm {m.fullName}
            </label>
          ))}
        <h3>Thành viên rút</h3>
        {roster.entries.map((e) => {
          const id = refId(e.clubMemberId);
          return (
            <label className="checkbox-row" key={id}>
              <input
                type="checkbox"
                checked={remove.includes(id)}
                onChange={(event) =>
                  setRemove(event.target.checked ? [...remove, id] : remove.filter((v) => v !== id))
                }
              />
              Bỏ {typeof e.clubMemberId === 'object' ? e.clubMemberId?.fullName : id}
            </label>
          );
        })}
        <div className="field">
          <label htmlFor="emergency-reason">Lý do khẩn cấp</label>
          <textarea
            id="emergency-reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <Button type="submit" busy={busy}>
          Gửi yêu cầu
        </Button>
      </form>
    </Modal>
  );
}
