import { useDebounceValue } from 'usehooks-ts';

import { SEARCH_INPUT_DEBOUNCE_MS } from '@/lib/constants/debounce';

type UseAppDebounceOptions = {
  delay?: number;
};

export function useAppDebounce<T>(value: T, options?: UseAppDebounceOptions): T {
  const [debouncedValue] = useDebounceValue(
    value,
    options?.delay ?? SEARCH_INPUT_DEBOUNCE_MS,
  );

  return debouncedValue;
}
