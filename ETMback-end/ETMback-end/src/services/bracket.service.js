export function buildSingleEliminationPairs(teamIds) {
  if (!Array.isArray(teamIds) || teamIds.length < 2) throw new Error("At least two teams are required");
  if (new Set(teamIds.map(String)).size !== teamIds.length) throw new Error("Duplicate teams are not allowed");
  const size = 2 ** Math.ceil(Math.log2(teamIds.length));
  const seeded = [...teamIds, ...Array(size - teamIds.length).fill(null)];
  return Array.from({ length: size / 2 }, (_, index) => ({
    round: 1, position: index + 1, teamAId: seeded[index], teamBId: seeded[size - 1 - index]
  }));
}

export function buildSingleEliminationStructure(teamIds, createId) {
  if (!Array.isArray(teamIds) || teamIds.length < 2) throw new Error("At least two teams are required");
  if (new Set(teamIds.map(String)).size !== teamIds.length) throw new Error("Duplicate teams are not allowed");
  const size = 2 ** Math.ceil(Math.log2(teamIds.length));
  const roundCount = Math.log2(size);
  const ids = Array.from({ length: roundCount }, (_, round) => Array.from({ length: size / (2 ** (round + 1)) }, () => createId()));
  const seeded = [...teamIds, ...Array(size - teamIds.length).fill(null)];
  const rounds = ids.map((roundIds, round) => roundIds.map((id, position) => ({
    _id: id,
    round: round + 1,
    position: position + 1,
    teamAId: round === 0 ? seeded[position] : null,
    teamBId: round === 0 ? seeded[size - 1 - position] : null,
    nextMatchId: round < roundCount - 1 ? ids[round + 1][Math.floor(position / 2)] : null,
    nextMatchSlot: round < roundCount - 1 ? (position % 2 === 0 ? "TeamA" : "TeamB") : null,
  })));
  for (const match of rounds[0]) {
    const automaticWinner = match.teamAId && !match.teamBId ? match.teamAId : (!match.teamAId && match.teamBId ? match.teamBId : null);
    if (!automaticWinner || !match.nextMatchId) continue;
    const next = rounds[1].find((candidate) => String(candidate._id) === String(match.nextMatchId));
    if (match.nextMatchSlot === "TeamA") next.teamAId = automaticWinner;
    else next.teamBId = automaticWinner;
  }
  return rounds.flat();
}
