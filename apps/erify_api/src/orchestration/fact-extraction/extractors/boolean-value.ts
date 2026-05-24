/**
 * Parses a `rawValue` from `task.content` into a `boolean`, or returns
 * `null` when the value is absent or unrecognized. Field-level validation
 * catches non-boolean submissions; refusing to write here keeps a
 * surprise string from getting coerced into the indexed column.
 */
export function parseBooleanValue(raw: unknown): boolean | null {
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (raw === 'true') {
    return true;
  }
  if (raw === 'false') {
    return false;
  }
  return null;
}
