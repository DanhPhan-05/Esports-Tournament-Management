export function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  const aFrom = new Date(aStart).getTime();
  const bFrom = new Date(bStart).getTime();
  const aTo = aEnd ? new Date(aEnd).getTime() : Number.POSITIVE_INFINITY;
  const bTo = bEnd ? new Date(bEnd).getTime() : Number.POSITIVE_INFINITY;
  return aFrom <= bTo && bFrom <= aTo;
}

export function assertDateOrder(start, end, label = "date range") {
  if (end && new Date(end) < new Date(start)) throw new Error(`${label} is invalid`);
}
