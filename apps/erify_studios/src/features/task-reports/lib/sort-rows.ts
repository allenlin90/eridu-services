export type SortDirection = 'asc' | 'desc';

export function sortRows(
  rows: Record<string, any>[],
  columnKey: string | null,
  direction: SortDirection,
): Record<string, any>[] {
  if (!rows || rows.length === 0 || !columnKey)
    return rows;

  return [...rows].sort((a, b) => {
    const valA = a[columnKey];
    const valB = b[columnKey];

    // nulls always sort last
    if (valA === null || valA === undefined)
      return 1;
    if (valB === null || valB === undefined)
      return -1;

    // String comparison
    if (typeof valA === 'string' && typeof valB === 'string') {
      return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    // Number/Boolean comparison
    if (valA < valB)
      return direction === 'asc' ? -1 : 1;
    if (valA > valB)
      return direction === 'asc' ? 1 : -1;

    return 0;
  });
}
