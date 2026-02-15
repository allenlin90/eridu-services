import { memo, useMemo } from 'react';

import type { FieldItem } from './schema';
import { SortableFieldItem } from './sortable-field-item';

type SortableFieldListProps = {
  items: FieldItem[];
  onUpdate: (id: string, updates: Partial<FieldItem>) => void;
  onRemove: (id: string) => void;
  errors?: Record<string, string[]>;
};

export const SortableFieldList = memo(({ items, onUpdate, onRemove, errors }: SortableFieldListProps) => {
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

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <SortableFieldItem
          index={index}
          key={item.id}
          item={item}
          onUpdate={onUpdate}
          onRemove={onRemove}
          errors={errorsByItem[index]}
        />
      ))}
    </div>
  );
});
SortableFieldList.displayName = 'SortableFieldList';
