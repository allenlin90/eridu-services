/**
 * Validates a returnTo value to prevent open-redirect attacks.
 * Only allows relative paths starting with `/` (not `//` which could be a protocol-relative URL).
 *
 * @param value - raw returnTo query param value
 * @param fallback - default path when value is invalid (defaults to '/')
 */
export function normalizeReturnTo(value: string | null | undefined, fallback = '/'): string {
  if (!value)
    return fallback;
  if (value.startsWith('/') && !value.startsWith('//'))
    return value;
  return fallback;
}
