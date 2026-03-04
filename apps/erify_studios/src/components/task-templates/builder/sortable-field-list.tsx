import { memo, useEffect, useMemo, useRef } from 'react';

import type { FieldItem } from './schema';
import { SortableFieldItem } from './sortable-field-item';

type SortableFieldListProps = {
  items: FieldItem[];
  templateItems?: FieldItem[];
  onUpdate: (id: string, updates: Partial<FieldItem>) => void;
  onRemove: (id: string) => void;
  errors?: Record<string, string[]>;
  scrollToItemId?: string | null;
  onScrolledToItem?: () => void;
};

export const SortableFieldList = memo(({
  items,
  templateItems,
  onUpdate,
  onRemove,
  errors,
  scrollToItemId,
  onScrolledToItem,
}: SortableFieldListProps) => {
  const listRef = useRef<HTMLDivElement | null>(null);

  // Group errors by item index to avoid re-calculating in the loop
  const errorsByItem = useMemo(() => {
    const grouped: Record<number, Record<string, string[]>> = {};

    if (errors) {
      Object.entries(errors).forEach(([path, messages]) => {
        const match = path.match(/^items\.(\d+)\.(.*)/);
        if (match) {
          const index = Number.parseInt(match[1]);
          const relativePath = match[2];

          if (!grouped[index]) {
            grouped[index] = {};
          }
          grouped[index][relativePath] = messages;
        }
      });
    }

    return grouped;
  }, [errors]);

  useEffect(() => {
    if (!scrollToItemId || !items.some((item) => item.id === scrollToItemId)) {
      return;
    }

    const rafId = requestAnimationFrame(() => {
      const target = listRef.current?.querySelector<HTMLElement>(`[data-field-id="${scrollToItemId}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onScrolledToItem?.();
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [items, onScrolledToItem, scrollToItemId]);

  return (
    <div ref={listRef} className="space-y-3">
      {items.map((item, index) => {
        const absoluteIndex = templateItems ? templateItems.findIndex((i) => i.id === item.id) : index;
        return (
          <SortableFieldItem
            index={absoluteIndex}
            key={item.id}
            item={item}
            onUpdate={onUpdate}
            onRemove={onRemove}
            errors={errorsByItem[absoluteIndex]}
          />
        );
      })}
    </div>
  );
});
SortableFieldList.displayName = 'SortableFieldList';
