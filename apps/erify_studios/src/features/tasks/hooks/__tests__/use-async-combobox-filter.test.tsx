import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useAsyncComboboxFilter } from '../use-async-combobox-filter';

// The global test setup (src/test/setup.ts) mocks `useQuery` to a static stub.
// This suite exercises the real react-query behavior, so restore the actual module.
vi.mock('@tanstack/react-query', async () => await vi.importActual('@tanstack/react-query'));

type Item = { name: string };

const toOption = (item: Item) => ({ value: item.name, label: item.name });

function createWrapper() {
  const queryClient = new QueryClient({
    // throwOnError surfaces a regression where `fetchSelected` returns `undefined`
    // (React Query rejects undefined query data) as a thrown render error.
    defaultOptions: { queries: { retry: false, throwOnError: true } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAsyncComboboxFilter', () => {
  it('maps the fetched list to options', async () => {
    const { result } = renderHook(
      () =>
        useAsyncComboboxFilter<Item>({
          queryKeyBase: 'test-filter',
          studioId: 'studio-1',
          fetchList: async () => [{ name: 'Alpha' }, { name: 'Beta' }],
          fetchSelected: async () => null,
          toOption,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.options).toHaveLength(2));
    expect(result.current.options).toEqual([
      { value: 'Alpha', label: 'Alpha' },
      { value: 'Beta', label: 'Beta' },
    ]);
  });

  it('does not throw when the selected lookup resolves to null (no match)', async () => {
    const fetchSelected = vi.fn(async () => null);
    const { result } = renderHook(
      () =>
        useAsyncComboboxFilter<Item>({
          queryKeyBase: 'test-filter',
          studioId: 'studio-1',
          selectedValue: 'Missing',
          fetchList: async () => [{ name: 'Alpha' }],
          fetchSelected,
          toOption,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(fetchSelected).toHaveBeenCalled());
    await waitFor(() => expect(result.current.options).toHaveLength(1));
    expect(result.current.options).toEqual([{ value: 'Alpha', label: 'Alpha' }]);
  });

  it('prepends the resolved selection when it is outside the fetched page', async () => {
    const { result } = renderHook(
      () =>
        useAsyncComboboxFilter<Item>({
          queryKeyBase: 'test-filter',
          studioId: 'studio-1',
          selectedValue: 'Zeta',
          fetchList: async () => [{ name: 'Alpha' }],
          fetchSelected: async () => ({ name: 'Zeta' }),
          toOption,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.options).toHaveLength(2));
    expect(result.current.options[0]).toEqual({ value: 'Zeta', label: 'Zeta' });
  });

  it('does not duplicate the selection when it already appears in the list', async () => {
    const { result } = renderHook(
      () =>
        useAsyncComboboxFilter<Item>({
          queryKeyBase: 'test-filter',
          studioId: 'studio-1',
          selectedValue: 'Alpha',
          fetchList: async () => [{ name: 'Alpha' }, { name: 'Beta' }],
          fetchSelected: async () => ({ name: 'Alpha' }),
          toOption,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.options).toHaveLength(2));
    expect(result.current.options).toEqual([
      { value: 'Alpha', label: 'Alpha' },
      { value: 'Beta', label: 'Beta' },
    ]);
  });
});
