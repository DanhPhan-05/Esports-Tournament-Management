import type { Fixture } from '../types/competition';

export const PICK_WIDTH = 220;
export const PICK_HEIGHT = 122;
const COLUMN = 300;
const ROW = 170;
export const branchNames: Record<string, string> = {
  Winners: 'Nhánh thắng',
  Losers: 'Nhánh thua',
  Final: 'Chung kết tổng',
  Reset: 'Tái đấu chung kết',
  RoundRobin: 'Vòng tròn',
};
export function pickemLayout(matches: Fixture[]) {
  const nodes = new Map<string, { x: number; y: number; code: string }>();
  const headings: { x: number; y: number; label: string; detail: string }[] = [];
  const bands: { x: number; y: number; width: number; height: number; label: string }[] = [];
  let top = 55,
    maxColumns = 0;
  for (const section of ['Winners', 'Losers', 'RoundRobin']) {
    const group = matches.filter((m) => (m.section || 'Winners') === section);
    if (!group.length) continue;
    const rounds = [...new Set(group.map((m) => m.round))].sort((a, b) => a - b);
    const height = Math.max(...rounds.map((r) => group.filter((m) => m.round === r).length)) * ROW;
    maxColumns = Math.max(maxColumns, rounds.length);
    bands.push({
      x: 12,
      y: top - 45,
      width: rounds.length * COLUMN - 55,
      height: height + 90,
      label: branchNames[section],
    });
    for (const [col, round] of rounds.entries()) {
      const stage = group.filter((m) => m.round === round).sort((a, b) => a.position - b.position);
      const remaining = rounds.length - col;
      const label =
        section === 'Winners' && !matches.some((m) => m.section === 'Final')
          ? remaining === 1
            ? 'Chung kết'
            : remaining === 2
              ? 'Bán kết'
              : remaining === 3
                ? 'Tứ kết'
                : `Vòng ${col + 1}`
          : `${branchNames[section]} · Vòng ${col + 1}`;
      headings.push({
        x: 28 + col * COLUMN,
        y: top,
        label,
        detail: `${stage.length} trận · BO${stage[0].bestOf}`,
      });
      stage.forEach((m, index) => {
        const feeders = group
          .filter((f) => f.nextMatchId === m._id)
          .map((f) => nodes.get(f._id))
          .filter((v) => !!v);
        const y = feeders.length
          ? feeders.reduce((sum, p) => sum + p.y, 0) / feeders.length
          : top + 65 + (index + 0.5) * (height / stage.length) - PICK_HEIGHT / 2;
        const code = `${section === 'Losers' ? 'L' : section === 'RoundRobin' ? 'R' : 'W'}${round}-${m.position}`;
        nodes.set(m._id, { x: 28 + col * COLUMN, y, code });
      });
    }
    top += height + 160;
  }
  const finals = matches
    .filter((m) => m.section === 'Final' || m.section === 'Reset')
    .sort((a, b) => a.round - b.round);
  finals.forEach((m, i) => {
    const feeders = matches
      .filter((f) => f.nextMatchId === m._id)
      .map((f) => nodes.get(f._id))
      .filter((v) => !!v);
    const y = feeders.length
      ? feeders.reduce((sum, p) => sum + p.y, 0) / feeders.length
      : (nodes.get(finals[0]?._id)?.y ?? 120);
    const x = 28 + (maxColumns + i) * COLUMN;
    nodes.set(m._id, { x, y, code: m.section === 'Reset' ? 'GF2' : 'GF' });
    headings.push({
      x,
      y: y - 65,
      label: branchNames[m.section],
      detail: m.section === 'Reset' ? 'Chỉ diễn ra nếu cần' : 'Đội thắng hai nhánh gặp nhau',
    });
  });
  const width = Math.max(320, ...[...nodes.values()].map((p) => p.x + PICK_WIDTH + 28));
  const height = Math.max(300, ...[...nodes.values()].map((p) => p.y + PICK_HEIGHT + 50));
  const edges: { key: string; path: string; kind: string; label: string }[] = [];
  for (const m of matches) {
    const from = nodes.get(m._id);
    if (!from) continue;
    const connections: [string | null | undefined, string | null | undefined, string][] = [
      [m.nextMatchId, m.nextMatchSlot, 'winner'],
      [m.loserNextMatchId, m.loserNextMatchSlot, 'loser'],
    ];
    // The backend activates the optional reset from the grand-final result.
    if (m.section === 'Final' && !m.nextMatchId) {
      const reset = finals.find((f) => f.section === 'Reset');
      if (reset) connections.push([reset._id, 'TeamA', 'conditional']);
    }
    for (const [id, slot, kind] of connections) {
      const to = id ? nodes.get(id) : null;
      if (!to) continue;
      const startX = from.x + PICK_WIDTH,
        startY = from.y + PICK_HEIGHT / 2,
        endY = to.y + (slot === 'TeamB' ? 84 : 46);
      let path: string;
      if (kind === 'loser') {
        const lane = from.x + PICK_WIDTH + 18 + m.position * 3;
        const lower = bands.find((b) => b.label === branchNames.Losers);
        const gapY = (lower?.y ?? to.y) - 14 - m.position * 5;
        const entryX = to.x - 14 - m.position * 3;
        path = `M ${startX} ${startY} H ${lane} V ${gapY} H ${entryX} V ${endY} H ${to.x}`;
      } else {
        const mid = startX + Math.max(22, (to.x - startX) / 2);
        path = `M ${startX} ${startY} H ${mid} V ${endY} H ${to.x}`;
      }
      edges.push({
        key: m._id + ':' + kind,
        path,
        kind,
        label: `${kind === 'loser' ? 'Thua' : 'Thắng'} ${from.code} → ${to.code}`,
      });
    }
  }
  return { nodes, headings, bands, edges, width, height };
}
