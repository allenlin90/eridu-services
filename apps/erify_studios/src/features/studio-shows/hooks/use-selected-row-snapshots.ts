import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';

import { resolveUpdater } from '@/lib/table-state.utils';

type SelectableRow = {
  id: string;
};

export function useSelectedRowSnapshots<TItem extends SelectableRow>(items: TItem[]) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedSnapshots, setSelectedSnapshots] = useState<Record<string, TItem>>({});

  const selectedIds = useMemo(
    () => Object.entries(rowSelection)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id),
    [rowSelection],
  );

  const itemsById = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  );

  const onRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>(
    (updater) => {
      const nextSelection = resolveUpdater(updater, rowSelection);
      const nextSelectedIds = new Set(
        Object.entries(nextSelection)
          .filter(([, isSelected]) => isSelected)
          .map(([id]) => id),
      );

      setRowSelection(nextSelection);
      setSelectedSnapshots((previousSnapshots) => {
        const nextSnapshots: Record<string, TItem> = {};
        nextSelectedIds.forEach((id) => {
          const item = itemsById[id] ?? previousSnapshots[id];
          if (item) {
            nextSnapshots[id] = item;
          }
        });

        const previousKeys = Object.keys(previousSnapshots);
        const nextKeys = Object.keys(nextSnapshots);
        const hasSameStructure = previousKeys.length === nextKeys.length
          && nextKeys.every((id) => previousSnapshots[id] === nextSnapshots[id]);
        return hasSameStructure ? previousSnapshots : nextSnapshots;
      });
    },
    [itemsById, rowSelection],
  );

  const clearSelection = useCallback(() => {
    setRowSelection({});
    setSelectedSnapshots({});
  }, []);

  const selectedItems = useMemo(() => {
    return selectedIds
      .map((id) => itemsById[id] ?? selectedSnapshots[id] ?? null)
      .filter((item): item is TItem => item !== null);
  }, [itemsById, selectedIds, selectedSnapshots]);

  return {
    rowSelection,
    selectedIds,
    selectedItems,
    onRowSelectionChange,
    clearSelection,
  };
}
