/**
 * Toggle a value in a multi-select array: drop it if already present, append it
 * otherwise. Preserves the order of existing values and appends new ones at the
 * end — matching the `includes ? filter : [...spread]` pattern that was
 * copy-pasted across the studios filter surfaces (schedule-publish impacts,
 * performance shows, my-tasks).
 */
export function toggleArrayValue<T>(current: readonly T[], value: T): T[] {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}
