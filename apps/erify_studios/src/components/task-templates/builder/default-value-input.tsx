import { X } from 'lucide-react';
import { memo } from 'react';

import {
  Button,
  Checkbox,
  DatePicker,
  Input,
  Label,
  ResponsiveDateTimePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import { MultiSelect } from '../shared/multi-select';

import type { FieldItem } from './schema';

/**
 * Renders the "Default Value" control matched to the field's type
 * (select / multiselect / date / datetime / checkbox / text|number|url).
 * Emits the typed default through `onChange`; holds no state.
 */
export const DefaultValueInput = memo(({
  item,
  onChange,
}: {
  item: FieldItem;
  onChange: (val: string | number | boolean | string[]) => void;
}) => {
  const id = `default-${item.id}`;

  if (item.type === 'select') {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>Default Value</Label>
        <Select value={item.default_value as string} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Select default option" />
          </SelectTrigger>
          <SelectContent>
            {item.options
              ?.filter((opt) => opt.value)
              .map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label || opt.value}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (item.type === 'multiselect') {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>Default Value</Label>
        <MultiSelect
          options={item.options || []}
          value={Array.isArray(item.default_value) ? item.default_value : []}
          onChange={onChange}
          placeholder="Select default options"
        />
      </div>
    );
  }

  if (item.type === 'date') {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>Default Value</Label>
        <div className="flex gap-2">
          <DatePicker value={item.default_value as string} onChange={onChange} className="flex-1" />
          {item.default_value && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange('')}
              title="Clear date"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (item.type === 'datetime') {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>Default Value</Label>
        <div className="flex gap-2">
          <ResponsiveDateTimePicker value={item.default_value as string} onChange={onChange} className="flex-1" />
          {item.default_value && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange('')}
              title="Clear date time"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (item.type === 'checkbox') {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>Default Value</Label>
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id={id}
            checked={!!item.default_value}
            onCheckedChange={onChange}
          />
          <Label htmlFor={id} className="font-normal cursor-pointer">
            Checked by default
          </Label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Default Value</Label>
      <Input
        id={id}
        type={item.type === 'number' ? 'number' : item.type === 'url' ? 'url' : 'text'}
        value={item.default_value || ''}
        onChange={(e) => {
          const rawVal = e.target.value;
          const val = item.type === 'number'
            ? rawVal === '' ? '' : Number.parseFloat(rawVal)
            : rawVal;
          onChange(val);
        }}
        placeholder="Optional default answer"
      />
    </div>
  );
});
DefaultValueInput.displayName = 'DefaultValueInput';
