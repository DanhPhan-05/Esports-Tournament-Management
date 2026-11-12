import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { competitionApi } from '../../services/competition';
import { save } from '../../services/management';
import { Button, PageHeading, QueryError, Spinner } from '../../components/ui';
import { ConfirmAction, Status } from '../../components/management';
import { DocumentLinks } from '../../components/DocumentUpload';
import { formatDate } from '../../utils/account';
export function ApplicationDetailPage({ review = false }: { review?: boolean }) {
  const params = useParams();
  const id = params.appId || params.id || '';
  const query = useQuery({ queryKey: ['application', id], queryFn: () => competitionApi.application(id) });
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
  const { application: a, roster } = query.data;
  const tournament = a.tournamentId;
  const editable = ['Draft', 'NeedMoreInfo'].includes(a.status);
  const actions = review
    ? ['Submitted', 'UnderReview', 'NeedMoreInfo'].includes(a.status)
      ? [
          ['approve', 'Duyệt hồ sơ'],
          ['reject', 'Từ chối hồ sơ'],
          ['request-info', 'Yêu cầu bổ sung'],
        ]
      : []
    : [
        ...(editable ? [['submit', 'Nộp hồ sơ']] : []),
        ...(!['Approved', 'Rejected', 'Withdrawn'].includes(a.status) &&
        Date.now() < Date.parse(tournament.registrationCloseAt)
          ? [['withdraw', 'Rút hồ sơ']]
          : []),
      ];
  return (
    <>
      <Link to={review ? `/to/tournaments/${tournament._id}/applications` : '/cm/applications'}>
        ← Danh sách hồ sơ
      </Link>
      <PageHeading
        title={tournament.name}
        description={a.teamId?.name}
        action={
          <div className="row-actions">
            {!review && editable && (
              <Link className="button secondary" to={`/cm/applications/${id}/edit`}>
                Bổ sung hồ sơ
              </Link>
            )}
            {actions.map(([key, label]) => (
              <Button key={key} variant="secondary" onClick={() => setAction(key)}>
                {label}
              </Button>
            ))}
          </div>
        }
      />
      <Status value={a.status} />
      <div className="dashboard-grid spaced">
        <section className="panel">
          <h2>Thông tin hồ sơ</h2>
          <p className="prose">{a.note || 'Chưa có thông tin bổ sung.'}</p>
          <h3>Tài liệu</h3>
          <DocumentLinks urls={a.documents || []} />
          {!(a.documents || []).length && <p className="muted">Chưa có tài liệu.</p>}
          <h3 className="spaced">Ý kiến xét duyệt</h3>
          <p className="prose">{a.reviewNote || 'Chưa có ý kiến xét duyệt.'}</p>
          {roster && (
            <Link to={review ? `/to/rosters/${roster._id}` : `/cm/rosters/${roster._id}/edit`}>
              Xem đội hình · {roster.status} →
            </Link>
          )}
        </section>
        <section className="panel">
          <h2>Các mốc hồ sơ</h2>
          <ol className="timeline">
            {[
              ['Tạo hồ sơ', a.createdAt],
              ['Nộp hồ sơ', a.submittedAt],
              ['Xét duyệt gần nhất', a.reviewedAt],
              ['Cập nhật gần nhất', a.updatedAt],
            ].map(([label, date]) => (
              <li key={label}>
                <strong>{label}</strong>
                <span>{formatDate(date, true)}</span>
              </li>
            ))}
          </ol>
          <p className="muted small">Thời gian tạo, nộp và xét duyệt được cập nhật theo hồ sơ.</p>
        </section>
      </div>
      {action && (
        <ConfirmAction
          title={actions.find(([key]) => key === action)?.[1] || 'Xác nhận'}
          description={
            action === 'submit'
              ? 'Hồ sơ và roster sẽ được kiểm tra trước khi nộp.'
              : 'Thao tác cập nhật trạng thái hồ sơ.'
          }
          reason={review && action !== 'approve'}
          onClose={() => setAction('')}
          action={(reason) =>
            review
              ? save(
                  `/tournaments/${tournament._id}/applications/${id}/${action}`,
                  { reviewNote: reason },
                  'put',
                )
              : save(`/applications/${id}/${action}`, {})
          }
        />
      )}
    </>
  );
}
