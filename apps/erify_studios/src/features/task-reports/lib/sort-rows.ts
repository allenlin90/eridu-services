export type SortDirection = 'asc' | 'desc';
export type SortableReportRow = Record<string, boolean | number | string | null | undefined>;

export function sortRows(
  rows: SortableReportRow[],
  columnKey: string | null,
  direction: SortDirection,
): SortableReportRow[] {
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
      if (direction === 'asc') {
        return valA.localeCompare(valB);
      }

      return valB.localeCompare(valA);
    }

    // Number/Boolean comparison
    if (valA < valB) {
      if (direction === 'asc') {
        return -1;
      }

      return 1;
    }

    if (valA > valB) {
      if (direction === 'asc') {
        return 1;
      }

      return -1;
    }

    return 0;
  });
}
