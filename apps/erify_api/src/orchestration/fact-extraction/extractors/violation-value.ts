/**
 * Shared parser for `show_platform_violation` multiselect values. Consumed
 * by `ShowPlatformViolationExtractor` (decides what to write) AND by
 * `isFactValueParseable` in `fact-extraction.service.ts` (decides whether
 * to count the fact as a co-submitted writer for collision routing).
 * Keeping the contract in one place prevents the two callers from drifting
 * apart — a mismatch would cause `skipped_collision` outcomes for malformed
 * payloads the extractor would noop, or missed collision guards for valid
 * entries the extractor would still write.
 */

export const DEFAULT_VIOLATION_SEVERITY = 'WARNING';

export type ParsedViolation = {
  violationType: string;
  severity: string;
};

export function parseViolationValue(rawValue: unknown): ParsedViolation[] | null {
  if (!Array.isArray(rawValue)) {
    return null;
  }

  // An empty input array is the operator clearing all violations and must
  // proceed (return []). A non-empty input where every entry failed
  // validation is a malformed payload; treat it as absent (return null)
  // so neither write nor collision routing classifies it as a writer.
  const violations = rawValue
    .map(parseViolationEntry)
    .filter((entry): entry is ParsedViolation => entry !== null);
  if (rawValue.length > 0 && violations.length === 0) {
    return null;
  }
  return violations;
}

export function parseViolationEntry(entry: unknown): ParsedViolation | null {
  if (typeof entry !== 'string') {
    return null;
  }

  const [rawType, rawSeverity] = entry.split(':', 2);
  const violationType = rawType?.trim().toUpperCase();
  if (!violationType) {
    return null;
  }

  const severity = rawSeverity?.trim().toUpperCase() || DEFAULT_VIOLATION_SEVERITY;
  return { violationType, severity };
}
