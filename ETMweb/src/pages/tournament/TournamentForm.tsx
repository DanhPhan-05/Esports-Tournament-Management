import { useEffect, useRef, useState } from 'react';
import { useForm, type FieldValues } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { managementApi, save } from '../../services/management';
import { Alert, Button, PageHeading, QueryError, Spinner } from '../../components/ui';
import { Fields, ImageUpload } from '../../components/management';
import { dateOrder, localDate } from '../../utils/management';
import { refId, type Tournament } from '../../types/management';
import { currencies, formatPrize, prizeValues, tournamentSlug } from '../../utils/tournament';
export function TournamentFormPage() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ['to', 'tournament', id],
    queryFn: () => managementApi.tournament(id!),
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
  if (query.data && !['Draft', 'RegistrationOpen'].includes(query.data.status))
    return <Alert>Giải đấu hiện tại không còn được phép chỉnh sửa.</Alert>;
  return <TournamentForm key={id || 'new'} existing={query.data} />;
}
const timeline = ['registrationOpenAt', 'registrationCloseAt', 'rosterLockAt', 'startAt', 'endAt'];
function TournamentForm({ existing }: { existing?: Tournament }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [publish, setPublish] = useState(false);
  const [uploading, setUploading] = useState(false);
  const created = useRef('');
  const games = useQuery({ queryKey: ['games'], queryFn: managementApi.games });
  const regions = useQuery({ queryKey: ['tournament-regions'], queryFn: managementApi.tournamentRegions });
  const form = useForm<FieldValues>({
    defaultValues: existing
      ? {
          ...existing,
          ...prizeValues(existing.prizePool, existing.prizeCurrency),
          gameId: refId(existing.gameId),
          ...Object.fromEntries(
            timeline.map((k) => [k, localDate(existing[k as keyof Tournament] as string)]),
          ),
        }
      : {
          tournamentType: 'SingleElimination',
          maxTeams: 8,
          minRosterSize: 5,
          maxRosterSize: 7,
          prizePool: '',
          prizeCurrency: 'VND',
          ...Object.fromEntries(
            timeline.map((k, i) => [k, localDate(new Date(Date.now() + i * 86400000).toISOString())]),
          ),
        },
  });
  const name = form.watch('name');
  useEffect(() => {
    if (!existing && !form.getFieldState('slug').isDirty) form.setValue('slug', tournamentSlug(name || ''));
  }, [name, existing, form]);
  const fields: Parameters<typeof Fields>[0]['fields'][] = [
    [
      { name: 'name', label: 'Tên giải đấu', required: true },
      { name: 'slug', label: 'Slug (chữ thường, số, dấu gạch ngang)', required: true },
      {
        name: 'gameId',
        label: 'Game',
        required: true,
        options: [
          { value: '', label: 'Chọn game' },
          ...(games.data || []).map((g) => ({ value: g._id, label: g.name })),
          ...(existing && !(games.data || []).some((g) => g._id === refId(existing.gameId))
            ? [
                {
                  value: refId(existing.gameId),
                  label:
                    typeof existing.gameId === 'object'
                      ? `${existing.gameId.name} (hiện tại)`
                      : 'Game hiện tại',
                },
              ]
            : []),
        ],
      },
      { name: 'description', label: 'Mô tả', type: 'textarea' },
    ],
    [
      {
        name: 'tournamentType',
        label: 'Thể thức',
        required: true,
        options: ['SingleElimination', 'DoubleElimination', 'RoundRobin'].map((v) => ({
          value: v,
          label: v,
        })),
      },
      { name: 'maxTeams', label: 'Số đội tối đa', type: 'number', required: true },
      { name: 'minRosterSize', label: 'Roster tối thiểu', type: 'number', required: true },
      { name: 'maxRosterSize', label: 'Roster tối đa', type: 'number', required: true },
    ],
    timeline.map((name, i) => ({
      name,
      label: ['Mở đăng ký', 'Đóng đăng ký', 'Khóa roster', 'Bắt đầu giải', 'Kết thúc giải'][i],
      type: 'datetime-local',
      required: true,
    })),
    [
      { name: 'rules', label: 'Điều lệ', type: 'textarea', required: true },
      { name: 'region', label: 'Khu vực', suggestions: regions.data || [] },
      { name: 'venue', label: 'Địa điểm' },
    ],
    [],
  ];
  async function next() {
    if (uploading) return;
    setError('');
    if (!(await form.trigger(fields[step].map((f) => f.name)))) return;
    const v = form.getValues();
    if (step === 0) {
      v.slug = tournamentSlug(v.slug || v.name || '');
      form.setValue('slug', v.slug);
    }
    if (step === 0 && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug)) {
      setError('Slug chỉ dùng chữ thường, số và dấu gạch ngang.');
      return;
    }
    if (step === 1 && (v.maxTeams < 2 || v.maxRosterSize < v.minRosterSize)) {
      setError('Cần ít nhất 2 đội; roster tối đa không nhỏ hơn tối thiểu.');
      return;
    }
    if (step === 2 && !dateOrder(timeline.map((k) => v[k]))) {
      setError('Các mốc thời gian phải tăng dần theo thứ tự.');
      return;
    }
    if (
      step === 3 &&
      String(v.prizePool ?? '').trim() !== '' &&
      (!Number.isFinite(Number(v.prizePool)) ||
        Number(v.prizePool) < 0 ||
        !currencies.includes(v.prizeCurrency))
    ) {
      setError('Nhập số tiền không âm và chọn đơn vị tiền tệ.');
      return;
    }
    setStep(step + 1);
  }
  return (
    <>
      <PageHeading
        title={existing ? 'Chỉnh sửa giải đấu' : 'Tạo giải đấu'}
        description="Thiết lập game, thể thức, lịch thi đấu và điều lệ. Trạng thái công bố được xác nhận rõ ở bước cuối."
      />
      <ol className="wizard-steps" aria-label="Các bước tạo giải đấu">
        {['Game', 'Thể thức', 'Lịch', 'Điều lệ', 'Xác nhận'].map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined}>
            <button
              type="button"
              disabled={i >= step || form.formState.isSubmitting}
              onClick={() => setStep(i)}
              aria-label={i < step ? `Quay lại bước ${i + 1}: ${s}` : undefined}
            >
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>
      <section className="panel narrow">
        <Alert>{error}</Alert>
        {games.isError && (
          <QueryError
            message={games.error.message}
            retry={() => {
              void games.refetch();
            }}
          />
        )}
        <form
          onSubmit={(e) => {
            if (uploading) {
              e.preventDefault();
              return;
            }
            if (step !== 4) {
              e.preventDefault();
              void next();
              return;
            }
            void form.handleSubmit(async (v) => {
              setError('');
              try {
                const payload = {
                  ...v,
                  prizePool: String(v.prizePool ?? '').trim() === '' ? '' : String(Number(v.prizePool)),
                  prizeCurrency: String(v.prizePool ?? '').trim() === '' ? undefined : v.prizeCurrency,
                  ...Object.fromEntries(timeline.map((k) => [k, new Date(v[k]).toISOString()])),
                };
                let id = existing?._id || created.current;
                if (!id) {
                  const response = await save<Tournament>('/tournaments', payload);
                  id = response.data._id;
                  created.current = id;
                } else if (existing || created.current) await save(`/tournaments/${id}`, payload, 'put');
                if (publish && !existing) await save(`/tournaments/${id}/publish`, {});
                await client.invalidateQueries();
                navigate(`/to/tournaments/${id}`);
              } catch (e) {
                setError(
                  `${created.current ? 'Bản nháp đã được tạo; thử lại để công bố, không tạo bản trùng. ' : ''}${(e as Error).message}`,
                );
              }
            })(e);
          }}
        >
          <Fields register={form.register} errors={form.formState.errors} fields={fields[step]} />
          {step === 3 && (
            <>
              <div className="field">
                <label htmlFor="prizePool">Giải thưởng</label>
                <input
                  id="prizePool"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Chưa công bố"
                  {...form.register('prizePool')}
                />
              </div>
              <div className="field">
                <label htmlFor="prizeCurrency">Đơn vị tiền tệ</label>
                <select id="prizeCurrency" {...form.register('prizeCurrency')}>
                  <option value="">Chọn đơn vị</option>
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
              <small className="muted">Khu vực có thể chọn từ gợi ý hoặc nhập giá trị mới.</small>
            </>
          )}
          {step === 0 && (
            <ImageUpload
              scope="tournament"
              entityId={existing?._id}
              assetName={form.watch('slug') || form.watch('name')}
              value={form.watch('bannerUrl')}
              onChange={(url) => form.setValue('bannerUrl', url)}
              onBusy={setUploading}
            />
          )}
          {step === 4 && (
            <>
              <h2>{form.getValues('name')}</h2>
              <p className="prose">
                {form.getValues('tournamentType')} · {form.getValues('maxTeams')} đội ·{' '}
                {form.getValues('region') || 'Chưa có khu vực'}
              </p>
              <p className="muted">Bắt đầu: {form.getValues('startAt')?.replace('T', ' ')}</p>
              <p className="muted">
                Giải thưởng:{' '}
                {formatPrize({
                  prizePool: form.getValues('prizePool'),
                  prizeCurrency: form.getValues('prizeCurrency'),
                })}
              </p>
              {!existing && (
                <section className={`publish-choice ${publish ? 'is-publishing' : 'is-draft'}`}>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
                    <span>
                      <strong>{publish ? 'Công bố giải ngay sau khi tạo' : 'Tạo giải ở trạng thái bản nháp'}</strong>
                      <small>
                        {publish
                          ? 'Customer sẽ nhìn thấy giải đấu sau khi hệ thống xác nhận công bố.'
                          : 'Giải chưa hiển thị công khai. Bạn có thể công bố sau tại trang quản lý giải đấu.'}
                      </small>
                    </span>
                  </label>
                </section>
              )}
            </>
          )}
          <div className="form-actions">
            <Link className="button secondary" to="/to/tournaments">
              Hủy
            </Link>
            {step > 0 && (
              <Button
                type="button"
                variant="secondary"
                disabled={form.formState.isSubmitting}
                onClick={() => setStep(step - 1)}
              >
                Quay lại
              </Button>
            )}
            <Button
              type="submit"
              busy={form.formState.isSubmitting}
              disabled={games.isPending || games.isError || uploading}
            >
              {step === 4
                ? existing
                  ? 'Lưu thay đổi'
                  : publish
                    ? 'Tạo và công bố giải'
                    : 'Tạo bản nháp'
                : 'Tiếp tục'}
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}
