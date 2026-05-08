export type NormalizationSummaryForGate = {
  invalid: number;
};

export function getNormalizationExitCode(summary: NormalizationSummaryForGate): 0 | 1 {
  return summary.invalid > 0 ? 1 : 0;
}
