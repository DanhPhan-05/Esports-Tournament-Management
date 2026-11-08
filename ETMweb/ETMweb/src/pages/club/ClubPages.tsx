import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useClub } from './ClubScope';
import { managementApi, save } from '../../services/management';
import { Alert, Avatar, Button, PageHeading, QueryError, Spinner } from '../../components/ui';
import { Fields, ImageUpload, Status } from '../../components/management';
import { refId } from '../../types/management';
import { pendingApplication } from '../../utils/management';
export function ClubDashboard() {
  const club = useClub();
  const query = useQuery({
    queryKey: ['cm', club._id, 'summary'],
    queryFn: async () => {
      const [members, teams, applications] = await Promise.all([
        managementApi.members(club._id, { limit: 1 }),
        managementApi.teams(club._id),
        managementApi.applications(),
      ]);
      return {
        members: members.pagination?.total || 0,
        teams,
        pending: applications.filter(
          (a) => teams.some((t) => t._id === refId(a.teamId)) && pendingApplication(a.status),
        ).length,
      };
    },
  });
  return (
    <>
      <PageHeading
        eyebrow="CLUB WORKSPACE"
        title={club.name}
        description="Quản lý hoạt động, đội tuyển và thành viên của câu lạc bộ."
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
        <div className="stats-grid">
          {[
            ['Thành viên', query.data.members],
            ['Team', query.data.teams.length],
            ['Hồ sơ chờ xử lý', query.data.pending],
          ].map(([label, value]) => (
            <article className="panel stat" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
      )}
      <div className="dashboard-grid">
        <Link className="panel quick-link" to="/cm/club">
          <h2>Hồ sơ câu lạc bộ</h2>
          <p>
            {club.isVerified ? 'Đã xác minh' : 'Chưa xác minh'} · {club.region || 'Chưa cập nhật khu vực'}
          </p>
        </Link>
        <Link className="panel quick-link" to="/cm/members">
          <h2>Thành viên và đội tuyển</h2>
          <p>Quản lý thời gian hoạt động và phân công team.</p>
        </Link>
      </div>
    </>
  );
}
export function ClubProfile() {
  const club = useClub();
  return (
    <>
      <PageHeading
        title="Hồ sơ câu lạc bộ"
        action={
          <Link className="button primary" to="/cm/club/edit">
            Chỉnh sửa
          </Link>
        }
      />
      <section className="panel">
        <div className="account-cell">
          <Avatar large name={club.name} url={club.logoUrl} />
          <div>
            <h1>{club.name}</h1>
            <p>{club.shortName}</p>
            <Status value={club.status} />
            <p className="muted">{club.isVerified ? '✓ Đã xác minh' : 'Chưa xác minh'}</p>
          </div>
        </div>
        <p className="prose">{club.description || 'Chưa có mô tả.'}</p>
        <dl className="detail-facts">
          <dt>Quốc gia / Khu vực</dt>
          <dd>
            {club.country || '—'} / {club.region || '—'}
          </dd>
          <dt>Email liên hệ</dt>
          <dd>{club.contactEmail}</dd>
          <dt>Số điện thoại</dt>
          <dd>{club.contactPhone || '—'}</dd>
        </dl>
      </section>
    </>
  );
}
export function EditClub() {
  const [uploading, setUploading] = useState(false);
  const club = useClub();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [error, setError] = useState('');
  const form = useForm({ defaultValues: { ...club } });
  return (
    <>
      <PageHeading title="Chỉnh sửa CLB" />
      <section className="panel narrow">
        <Alert>{error}</Alert>
        <form
          onSubmit={form.handleSubmit(async (v) => {
            if (uploading) return;
            try {
              await save(
                `/clubs/${club._id}`,
                {
                  name: v.name.trim(),
                  shortName: v.shortName,
                  description: v.description,
                  logoUrl: v.logoUrl,
                  country: v.country,
                  region: v.region,
                  contactEmail: v.contactEmail,
                  contactPhone: v.contactPhone,
                },
                'put',
              );
              await client.invalidateQueries({ queryKey: ['cm'] });
              navigate('/cm/club');
            } catch (e) {
              setError((e as Error).message);
            }
          })}
        >
          <ImageUpload
            scope="club"
            clubId={club._id}
            value={form.watch('logoUrl')}
            onChange={(url) => form.setValue('logoUrl', url, { shouldDirty: true })}
            onBusy={setUploading}
          />
          <Fields
            register={form.register as never}
            errors={form.formState.errors}
            fields={[
              { name: 'name', label: 'Tên CLB', required: true },
              { name: 'shortName', label: 'Tên viết tắt', required: true },
              { name: 'description', label: 'Mô tả', type: 'textarea' },
              { name: 'country', label: 'Quốc gia' },
              { name: 'region', label: 'Khu vực' },
              { name: 'contactEmail', label: 'Email liên hệ', type: 'email', required: true },
              { name: 'contactPhone', label: 'Số điện thoại' },
            ]}
          />
          <div className="form-actions">
            <Link className="button secondary" to="/cm/club">
              Hủy
            </Link>
            <Button type="submit" busy={form.formState.isSubmitting} disabled={uploading}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}
