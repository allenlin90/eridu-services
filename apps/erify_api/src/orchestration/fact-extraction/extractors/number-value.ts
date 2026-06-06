/**
 * Parses a `rawValue` from `task.content` into a finite `number`, or returns
 * `null` when the value is absent, blank, or non-numeric. Shared by the
 * numeric performance extractors and the orchestrator's pre-flight
 * `isFactValueParseable` check so collision routing matches the extractor's
 * write/noop decision (an unparseable `'abc'` must not be advertised as a
 * writing fact). Whitespace-only strings coerce to `0` under bare `Number()`,
 * so they are rejected explicitly to mirror the extractor's `Prisma.Decimal`
 * construction (which throws on them).
 */
export function parseNumberValue(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
