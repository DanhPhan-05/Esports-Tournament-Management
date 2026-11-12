import { buildSingleEliminationStructure } from "./bracket.service.js";

export function buildCompetition(type, teamIds, createId) {
  if (teamIds.length < 2 || new Set(teamIds.map(String)).size !== teamIds.length) throw new Error("At least two distinct teams are required");
  if (teamIds.length > 128) throw new Error("At most 128 teams are supported");
  if (type === "RoundRobin") {
    const teams = [...teamIds]; if (teams.length % 2) teams.push(null);
    const matches = [];
    for (let round = 1; round < teams.length; round++) {
      for (let i = 0; i < teams.length / 2; i++) {
        const a = teams[i], b = teams[teams.length - 1 - i];
        if (a && b) matches.push({ _id: createId(), round, position: i + 1, teamAId: a, teamBId: b, section: "RoundRobin" });
      }
      teams.splice(1, 0, teams.pop());
    }
    return initial(matches);
  }
  if (!["SingleElimination", "DoubleElimination"].includes(type)) throw new Error("Supported formats: SingleElimination, DoubleElimination, RoundRobin");
  const winners = buildSingleEliminationStructure(teamIds, createId).map((m) => ({ ...m, section: "Winners" }));
  // Remove prefilled bye advancement; the evaluator resolves all source slots.
  for (const match of winners) if (match.round > 1) { match.teamAId = null; match.teamBId = null; }
  if (type === "SingleElimination") return initial(winners);
  const k = Math.max(...winners.map((m) => m.round)), size = 2 ** k;
  const losers = [];
  for (let r = 1; r <= 2 * (k - 1); r++) {
    const count = size / 2 ** (Math.ceil(r / 2) + 1);
    losers.push(Array.from({ length: count }, (_, i) => ({ _id: createId(), round: k + r, position: i + 1, section: "Losers", teamAId: null, teamBId: null })));
  }
  const final = { _id: createId(), round: 3 * k, position: 1, section: "Final", teamAId: null, teamBId: null };
  const reset = { _id: createId(), round: 3 * k + 1, position: 1, section: "Reset", teamAId: null, teamBId: null, enabled: false };
  for (const w of winners) {
    if (w.round === k) {
      w.nextMatchId = final._id; w.nextMatchSlot = "TeamA";
      w.loserNextMatchId = k === 1 ? final._id : losers.at(-1)[0]._id;
      w.loserNextMatchSlot = "TeamB";
    } else if (w.round === 1) {
      w.loserNextMatchId = losers[0][Math.floor((w.position - 1) / 2)]._id;
      w.loserNextMatchSlot = w.position % 2 ? "TeamA" : "TeamB";
    } else {
      const list = losers[2 * (w.round - 1) - 1];
      w.loserNextMatchId = list[list.length - w.position]._id;
      w.loserNextMatchSlot = "TeamB";
    }
  }
  for (let r = 0; r < losers.length; r++) for (let i = 0; i < losers[r].length; i++) {
    const m = losers[r][i];
    if (r === losers.length - 1) { m.nextMatchId = final._id; m.nextMatchSlot = "TeamB"; }
    else { m.nextMatchId = losers[r + 1][r % 2 === 0 ? i : Math.floor(i / 2)]._id; m.nextMatchSlot = r % 2 === 0 || i % 2 === 0 ? "TeamA" : "TeamB"; }
  }
  return initial([...winners, ...losers.flat(), final, reset]);
}
function initial(matches) {
  return matches.map((m) => ({ ...m, initialTeamAId: m.teamAId || null, initialTeamBId: m.teamBId || null }));
}

export function evaluateCompetition(matches, results) {
  const isFed = (id, slot) => matches.some((m) => String(m.nextMatchId) === String(id) && m.nextMatchSlot === slot || String(m.loserNextMatchId) === String(id) && m.loserNextMatchSlot === slot);
  const states = new Map(matches.map((m) => [String(m._id), { ...m,
    teamAId: m.initialTeamAId || (!isFed(m._id, "TeamA") ? m.teamAId : null) || null,
    teamBId: m.initialTeamBId || (!isFed(m._id, "TeamB") ? m.teamBId : null) || null,
    resolvedA: true, resolvedB: true, isBye: false }]));
  const byResult = new Map(results.filter((r) => r.status === "Confirmed").map((r) => [String(r.matchId), r]));
  const feed = (id, slot, team) => { const m = states.get(String(id)); if (m) { m[slot === "TeamA" ? "teamAId" : "teamBId"] = team; m[slot === "TeamA" ? "resolvedA" : "resolvedB"] = true; } };
  for (const m of states.values()) {
    for (const [id, slot] of [[m.nextMatchId, m.nextMatchSlot], [m.loserNextMatchId, m.loserNextMatchSlot]]) {
      const dest = states.get(String(id)); if (dest) dest[slot === "TeamA" ? "resolvedA" : "resolvedB"] = false;
    }
  }
  for (const m of [...states.values()].sort((a, b) => a.round - b.round || a.position - b.position)) {
    if (m.section === "Reset") {
      const final = [...states.values()].find((v) => v.section === "Final");
      const finalResult = final && byResult.get(String(final._id));
      m.enabled = Boolean(finalResult && String(finalResult.winnerTeamId) === String(final.teamBId));
      m.teamAId = m.enabled ? final.teamAId : null; m.teamBId = m.enabled ? final.teamBId : null;
      continue;
    }
    const result = byResult.get(String(m._id));
    const bye = m.section !== "RoundRobin" && m.resolvedA && m.resolvedB && (!m.teamAId || !m.teamBId);
    m.isBye = bye;
    if (!result && !bye) continue;
    const winner = result?.winnerTeamId || m.teamAId || m.teamBId || null;
    const loser = result ? (String(winner) === String(m.teamAId) ? m.teamBId : m.teamAId) : null;
    if (m.nextMatchId) feed(m.nextMatchId, m.nextMatchSlot, winner);
    if (m.loserNextMatchId) feed(m.loserNextMatchId, m.loserNextMatchSlot, loser);
  }
  return [...states.values()];
}
