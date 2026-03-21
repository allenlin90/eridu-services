import { readStringValues } from './filter-rows';

export type ViewFilterOption = {
  value: string;
  label: string;
};

function readOptions(preferredValues: unknown[], fallbackValues: unknown[]): ViewFilterOption[] {
  const labels = readStringValues(...preferredValues);
  const values = readStringValues(...fallbackValues);

  if (values.length > 0) {
    return values.map((value, index) => ({
      value,
      label: labels[index] ?? labels[0] ?? value,
    }));
  }

  return labels.map((label) => ({
    value: label,
    label,
  }));
}

export function buildViewFilterOptions(
  rows: Record<string, unknown>[],
  getPreferredValues: (row: Record<string, unknown>) => unknown[],
  getFallbackValues: (row: Record<string, unknown>) => unknown[],
): ViewFilterOption[] {
  const seen = new Set<string>();
  const options: ViewFilterOption[] = [];

  for (const row of rows) {
    for (const option of readOptions(getPreferredValues(row), getFallbackValues(row))) {
      if (seen.has(option.value)) {
        continue;
      }

      seen.add(option.value);
      options.push(option);
    }
  }

  return options;
}
