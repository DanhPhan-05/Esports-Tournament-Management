import type { ReactNode } from 'react';
import { Button } from './ui';
export interface StatisticField {
  name: string;
  value: string;
  original?: unknown;
  structured?: boolean;
}
export interface GameField {
  game: number;
  teamAScore: number;
  teamBScore: number;
}
export function StatisticFields({
  value,
  onChange,
}: {
  value: StatisticField[];
  onChange: (value: StatisticField[]) => void;
}) {
  return (
    <section className="result-fields">
      <h3>Thống kê bổ sung</h3>
      {value.map((row, index) => (
        <div className="statistic-fields" key={index}>
          <div className="field">
            <label htmlFor={`stat-name-${index}`}>Tên thống kê {index + 1}</label>
            <input
              id={`stat-name-${index}`}
              required
              value={row.name}
              readOnly={row.structured}
              placeholder="Ví dụ: Số điểm hạ gục"
              onChange={(e) =>
                onChange(value.map((r, i) => (i === index ? { ...r, name: e.target.value } : r)))
              }
            />
          </div>
          <div className="field">
            <label htmlFor={`stat-value-${index}`}>Giá trị {index + 1}</label>
            <input
              id={`stat-value-${index}`}
              value={row.value}
              readOnly={row.structured}
              onChange={(e) =>
                onChange(value.map((r, i) => (i === index ? { ...r, value: e.target.value } : r)))
              }
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            aria-label={`Bỏ thống kê ${index + 1}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            ×
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={() => onChange([...value, { name: '', value: '' }])}>
        Thêm thống kê
      </Button>
    </section>
  );
}
export function GameFields({
  value,
  teamNames,
  onChange,
}: {
  value: GameField[];
  teamNames: readonly [string, string];
  onChange: (value: GameField[]) => void;
}) {
  return (
    <section className="result-fields">
      <h3>Chi tiết từng ván</h3>
      {value.map((row, index) => (
        <div className="statistic-fields" key={index}>
          <span>Ván {row.game}</span>
          {(['teamAScore', 'teamBScore'] as const).map((field, i) => (
            <div className="field" key={field}>
              <label htmlFor={`game-${index}-${field}`}>{`Ván ${row.game} · ${teamNames[i]}`}</label>
              <input
                id={`game-${index}-${field}`}
                type="number"
                min={0}
                step={1}
                required
                value={row[field]}
                onChange={(e) =>
                  onChange(value.map((r, j) => (j === index ? { ...r, [field]: Number(e.target.value) } : r)))
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            aria-label={`Bỏ ván ${row.game}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            ×
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          onChange([
            ...value,
            { game: Math.max(0, ...value.map((v) => v.game)) + 1, teamAScore: 0, teamBScore: 0 },
          ])
        }
      >
        Thêm ván
      </Button>
    </section>
  );
}
export function StatisticValue({ value }: { value: unknown }): ReactNode {
  if (value === null || value === undefined) return '—';
  if (typeof value !== 'object') return String(value);
  return (
    <dl className="statistic-values">
      {Object.entries(value).map(([key, entry]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>
            <StatisticValue value={entry} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
