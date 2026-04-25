import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSelectedRowSnapshots } from '../use-selected-row-snapshots';

describe('useSelectedRowSnapshots', () => {
  it('keeps selected item snapshots when the row leaves the current page', () => {
    const firstPageItems = [
      { id: 'show_1', name: 'Morning Show' },
      { id: 'show_2', name: 'Evening Show' },
    ];

    const { result, rerender } = renderHook(
      ({ items }) => useSelectedRowSnapshots(items),
      { initialProps: { items: firstPageItems } },
    );

    act(() => {
      result.current.onRowSelectionChange({ show_1: true });
    });

    expect(result.current.selectedItems).toEqual([
      { id: 'show_1', name: 'Morning Show' },
    ]);

    rerender({ items: [{ id: 'show_3', name: 'Late Show' }] });

    expect(result.current.selectedItems).toEqual([
      { id: 'show_1', name: 'Morning Show' },
    ]);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedItems).toEqual([]);
    expect(result.current.rowSelection).toEqual({});
  });
});
