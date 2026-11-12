import { useId, type ReactNode } from 'react';
import { PICK_WIDTH, type pickemLayout } from '../utils/pickemLayout';
import '../styles/pickem.css';

export function BracketCanvas({
  layout,
  scale,
  children,
  className = '',
}: {
  layout: ReturnType<typeof pickemLayout>;
  scale: number;
  children: ReactNode;
  className?: string;
}) {
  const arrow = useId().replace(/[^a-zA-Z0-9_-]/g, '') + '-bracket-arrow';
  return (
    <div style={{ width: layout.width * scale, height: layout.height * scale }}>
      <div
        className={`pe-bracket-canvas ${className}`}
        style={{ width: layout.width, height: layout.height, transform: `scale(${scale})` }}
      >
        {layout.bands.map((b) => (
          <div
            key={b.label}
            className="pe-branch-band"
            style={{ left: b.x, top: b.y, width: b.width, height: b.height }}
          >
            <h2>{b.label}</h2>
          </div>
        ))}
        <svg
          className="pe-connections"
          width={layout.width}
          height={layout.height}
          aria-label="Đường nối giữa các trận"
        >
          <defs>
            <marker id={arrow} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <polygon points="0,0 5,2.5 0,5" fill="#718b97" />
            </marker>
          </defs>
          {layout.edges.map((edge) => (
            <path
              className={`pe-edge ${edge.kind}`}
              key={edge.key}
              d={edge.path}
              markerEnd={`url(#${arrow})`}
            >
              <title>{edge.label}</title>
            </path>
          ))}
        </svg>
        {layout.headings.map((h) => (
          <div
            className="pe-round-heading"
            key={`${h.x}:${h.y}`}
            style={{ left: h.x, top: h.y, width: PICK_WIDTH }}
          >
            <strong>{h.label}</strong>
            <small>{h.detail}</small>
          </div>
        ))}
        {children}
      </div>
    </div>
  );
}
