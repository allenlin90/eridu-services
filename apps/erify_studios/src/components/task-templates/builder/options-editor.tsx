import { Plus, Trash2 } from 'lucide-react';
import { memo, useCallback } from 'react';

import { Button, Input } from '@eridu/ui';

import type { FieldItem } from './schema';

/** A single select/multiselect option row; label edits derive a snake_case value. */
const OptionRow = memo(({
  index,
  option,
  onUpdate,
  onRemove,
}: {
  index: number;
  option: NonNullable<FieldItem['options']>[number];
  onUpdate: (index: number, updates: Partial<NonNullable<FieldItem['options']>[number]>) => void;
  onRemove: (index: number) => void;
}) => {
  return (
    <div className="flex gap-2">
      <Input
        value={option.label}
        onChange={(e) => {
          const val = e.target.value;
          const normalizedVal = val.toLowerCase().replace(/\s+/g, '_');
          onUpdate(index, {
            label: val,
            value: normalizedVal || '',
          });
        }}
        placeholder="Label"
        className="flex-1"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(index)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
});
OptionRow.displayName = 'OptionRow';

/**
 * Editor for the option list of select/multiselect fields: add/update/remove
 * rows and surface the "at least one option" requirement. Emits the full next
 * options array via `onChange`.
 */
export const OptionsEditor = memo(({
  options,
  onChange,
}: {
  options: NonNullable<FieldItem['options']>;
  onChange: (opts: NonNullable<FieldItem['options']>) => void;
}) => {
  const handleUpdate = useCallback((index: number, updates: Partial<NonNullable<FieldItem['options']>[number]>) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], ...updates };
    onChange(newOptions);
  }, [options, onChange]);

  const handleRemove = useCallback((index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    onChange(newOptions);
  }, [options, onChange]);

  const handleAdd = useCallback(() => {
    const newOptions = [
      ...options,
      { id: crypto.randomUUID(), label: '', value: '' },
    ];
    onChange(newOptions);
  }, [options, onChange]);

  return (
    <div className="space-y-2 p-3 bg-muted rounded-md text-sm">
      <div className="space-y-3">
        {options.map((option, index) => (
          <OptionRow
            key={option.id || index}
            index={index}
            option={option}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          {' '}
          Add Option
        </Button>
      </div>
      {options.length === 0 && (
        <p className="text-xs text-destructive">At least one option is required.</p>
      )}
    </div>
  );
});
OptionsEditor.displayName = 'OptionsEditor';
