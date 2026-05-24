/**
 * Shared system-fallback strings used when an extractor writes a creator
 * attendance reason but the operator submission omitted the sidecar. Kept
 * in one module so wording stays in lockstep across the single-fact
 * extractors and the paired-write processor (`applyPairedShowCreatorActuals`).
 */
export const LATE_REASON_FALLBACK
  = 'Late attendance reason was not provided by the task field.';

export const MISSING_REASON_FALLBACK
  = 'Missing attendance reason was not provided by the task field.';
