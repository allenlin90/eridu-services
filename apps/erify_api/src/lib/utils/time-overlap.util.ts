/**
 * Returns whether two half-open time ranges overlap.
 *
 * Touching edges are not overlapping: `[10:00, 12:00)` and
 * `[12:00, 14:00)` may run back-to-back.
 */
export function isTimeOverlapping(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();

  return s1 < e2 && s2 < e1;
}
