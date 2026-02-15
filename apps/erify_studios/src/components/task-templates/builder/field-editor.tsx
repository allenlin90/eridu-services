import { Plus, Trash2, X } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

import {
  Button,
  Checkbox,
  DatePicker,
  DateTimePicker,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';

import { MultiSelect } from '../shared/multi-select';

import type { FieldItem, FieldType } from './schema';
import { FieldTypeEnum } from './schema';

const FILE_TYPE_OPTIONS = [
  { label: 'Image', value: 'image/*' },
  { label: 'Video', value: 'video/*' },
  { label: 'PDF', value: '.pdf' },
  { label: 'CSV', value: '.csv' },
  { label: 'Text', value: 'text/plain' },
];

type FieldEditorProps = {
  item: FieldItem;
  onUpdate: (updates: Partial<FieldItem>) => void;
};

const DefaultValueInput = memo(({
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
          <DateTimePicker value={item.default_value as string} onChange={onChange} className="flex-1" />
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

const OptionsEditor = memo(({
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

const RequireReasonEditor = memo(({
  item,
  value,
  onChange,
}: {
  item: FieldItem;
  value: string;
  onChange: (val: string) => void;
}) => {
  return (
    <div className="space-y-2">
      <Label>Require Explanation</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Never" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Never</SelectItem>
          <SelectItem value="always">Always</SelectItem>
          {item.type === 'checkbox' && (
            <>
              <SelectItem value="on-true">When Checked (True)</SelectItem>
              <SelectItem value="on-false">When Unchecked (False)</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
      <p className="text-[10px] text-muted-foreground">
        Prompt the user to provide a reason when this condition is met.
      </p>
    </div>
  );
});
RequireReasonEditor.displayName = 'RequireReasonEditor';

const NumberConstraintsEditor = memo(({
  validation,
  onChange,
  itemId,
}: {
  validation: FieldItem['validation'];
  onChange: (val: any) => void;
  itemId: string;
}) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`min-${itemId}`}>Min Value</Label>
          <Input
            id={`min-${itemId}`}
            type="number"
            value={validation?.min ?? ''}
            onChange={(e) => {
              const val = e.target.value
                ? Number.parseFloat(e.target.value)
                : undefined;
              onChange({ min: val });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`max-${itemId}`}>Max Value</Label>
          <Input
            id={`max-${itemId}`}
            type="number"
            value={validation?.max ?? ''}
            onChange={(e) => {
              const val = e.target.value
                ? Number.parseFloat(e.target.value)
                : undefined;
              onChange({ max: val });
            }}
          />
        </div>
      </div>
      {typeof validation?.min === 'number'
      && typeof validation?.max === 'number'
      && validation.min > validation.max && (
        <p className="text-xs text-destructive">
          Min value cannot be greater than Max value.
        </p>
      )}
    </>
  );
});
NumberConstraintsEditor.displayName = 'NumberConstraintsEditor';

const ConditionOperatorSelector = memo(({
  index,
  itemType,
  value,
  onChange,
}: {
  index: number;
  itemType: string;
  value: string;
  onChange: (index: number, val: string) => void;
}) => {
  return (
    <Select value={value} onValueChange={(val) => onChange(index, val)}>
      <SelectTrigger className="w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {itemType === 'number' && (
          <>
            <SelectItem value="lt">Less than (&lt;)</SelectItem>
            <SelectItem value="lte">Less/Equal (&le;)</SelectItem>
            <SelectItem value="gt">Greater than (&gt;)</SelectItem>
            <SelectItem value="gte">Greater/Equal (&ge;)</SelectItem>
            <SelectItem value="eq">Equal to (=)</SelectItem>
            <SelectItem value="neq">Not Equal (&ne;)</SelectItem>
          </>
        )}
        {['date', 'datetime'].includes(itemType) && (
          <>
            <SelectItem value="lt">Before</SelectItem>
            <SelectItem value="gt">After</SelectItem>
            <SelectItem value="eq">On Date</SelectItem>
          </>
        )}
        {itemType === 'select' && (
          <>
            <SelectItem value="eq">Is</SelectItem>
            <SelectItem value="neq">Is Not</SelectItem>
          </>
        )}
        {itemType === 'multiselect' && (
          <>
            <SelectItem value="eq">Is</SelectItem>
            <SelectItem value="neq">Is Not</SelectItem>
            <SelectItem value="in">Is One Of</SelectItem>
            <SelectItem value="not_in">Is Not One Of</SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
});
ConditionOperatorSelector.displayName = 'ConditionOperatorSelector';

const ConditionValueInput = memo(({
  index,
  item,
  condition,
  onChange,
}: {
  index: number;
  item: FieldItem;
  condition: any;
  onChange: (index: number, val: any) => void;
}) => {
  if (item.type === 'number') {
    return (
      <Input
        type="number"
        value={condition.value as number}
        onChange={(e) => {
          const val = e.target.value === '' ? '' : Number.parseFloat(e.target.value);
          onChange(index, val);
        }}
        className="flex-1"
      />
    );
  }

  if (item.type === 'date') {
    return (
      <div className="flex gap-2 flex-1">
        <DatePicker
          value={condition.value as string}
          onChange={(val) => onChange(index, val)}
          className="flex-1"
        />
        {condition.value && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(index, '')}
            title="Clear date"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  if (item.type === 'datetime') {
    return (
      <div className="flex gap-2 flex-1">
        <DateTimePicker
          value={condition.value as string}
          onChange={(val) => onChange(index, val)}
          className="flex-1"
        />
        {condition.value && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(index, '')}
            title="Clear date time"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  if (['select', 'multiselect'].includes(item.type)) {
    if (condition.op === 'in' || condition.op === 'not_in') {
      return (
        <MultiSelect
          options={item.options || []}
          value={Array.isArray(condition.value) ? (condition.value as string[]) : []}
          onChange={(val) => onChange(index, val)}
          className="flex-1"
        />
      );
    }
    return (
      <Select value={condition.value as string} onValueChange={(val) => onChange(index, val)}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          {item.options
            ?.filter((opt) => opt.value && opt.value.trim() !== '')
            .map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label || opt.value}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    );
  }

  return null;
});
ConditionValueInput.displayName = 'ConditionValueInput';

const EMPTY_ARRAY: any[] = [];

const ConditionalLogicEditor = memo(({
  item,
  onChange,
}: {
  item: FieldItem;
  onChange: (val: FieldItem['validation']) => void;
}) => {
  const requireReasons = useMemo(() => Array.isArray(item.validation?.require_reason)
    ? item.validation.require_reason
    : EMPTY_ARRAY, [item.validation]);

  const updateReasonOp = useCallback((idx: number, op: string) => {
    const newReasons = [...requireReasons];
    newReasons[idx] = { ...newReasons[idx], op: op as any };
    onChange({ ...item.validation, require_reason: newReasons });
  }, [requireReasons, item.validation, onChange]);

  const updateReasonValue = useCallback((idx: number, value: any) => {
    const newReasons = [...requireReasons];
    newReasons[idx] = { ...newReasons[idx], value };
    onChange({ ...item.validation, require_reason: newReasons });
  }, [requireReasons, item.validation, onChange]);

  const removeReason = useCallback((idx: number) => {
    const newReasons = requireReasons.filter((_, i) => i !== idx);
    onChange({
      ...item.validation,
      require_reason: newReasons.length ? newReasons : undefined,
    });
  }, [requireReasons, item.validation, onChange]);

  const addReason = useCallback(() => {
    let defaultOp = 'eq';
    let defaultValue: any = '';

    if (item.type === 'number') {
      defaultOp = 'lt';
      defaultValue = 0;
    } else if (['date', 'datetime'].includes(item.type)) {
      defaultOp = 'lt';
      defaultValue = '';
    } else if (['select', 'multiselect'].includes(item.type)) {
      defaultOp = 'eq';
      defaultValue = item.options?.[0]?.value || '';
    }

    onChange({
      ...item.validation,
      require_reason: [
        ...requireReasons,
        { op: defaultOp as any, value: defaultValue },
      ],
    });
  }, [item.type, item.options, item.validation, requireReasons, onChange]);

  return (
    <div className="space-y-2">
      <Label>Conditional Explanation</Label>
      <div className="space-y-2">
        {requireReasons.map((cond, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground w-16">Value is</span>

            <ConditionOperatorSelector
              index={idx}
              itemType={item.type}
              value={cond.op}
              onChange={updateReasonOp}
            />

            <ConditionValueInput
              index={idx}
              item={item}
              condition={cond}
              onChange={updateReasonValue}
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeReason(idx)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={addReason}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          {' '}
          Add Condition
        </Button>
        <p className="text-[10px] text-muted-foreground">
          Require an explanation if any of these conditions are met.
        </p>
      </div>
    </div>
  );
});
ConditionalLogicEditor.displayName = 'ConditionalLogicEditor';

const ValidationRulesEditor = memo(({
  item,
  onChange,
}: {
  item: FieldItem;
  onChange: (val: FieldItem['validation']) => void;
}) => {
  if (item.type === 'file') {
    return (
      <div className="space-y-2">
        <Label>Allowed File Types</Label>
        <MultiSelect
          options={FILE_TYPE_OPTIONS}
          value={item.validation?.accept?.split(',').filter(Boolean) ?? []}
          onChange={(val) => {
            const str = val.join(',');
            onChange({ ...item.validation, accept: str || undefined });
          }}
          placeholder="Select allowed file types"
        />
        <p className="text-[10px] text-muted-foreground">
          Leave empty to allow all file types.
        </p>
      </div>
    );
  }

  if (['text', 'textarea', 'url', 'checkbox'].includes(item.type)) {
    return (
      <RequireReasonEditor
        item={item}
        value={
          typeof item.validation?.require_reason === 'string'
            ? item.validation.require_reason
            : 'none'
        }
        onChange={(reason) =>
          onChange({
            ...item.validation,
            require_reason: reason === 'none' ? undefined : (reason as any),
          })}
      />
    );
  }

  if (
    ['number', 'date', 'datetime', 'select', 'multiselect'].includes(item.type)
  ) {
    return (
      <div className="space-y-4">
        {item.type === 'number' && (
          <NumberConstraintsEditor
            validation={item.validation}
            onChange={(val) => onChange({ ...item.validation, ...val })}
            itemId={item.id}
          />
        )}
        <ConditionalLogicEditor item={item} onChange={onChange} />
      </div>
    );
  }

  return null;
});
ValidationRulesEditor.displayName = 'ValidationRulesEditor';

export const FieldEditor = memo(({ item, onUpdate }: FieldEditorProps) => {
  const handleChange = useCallback((field: keyof FieldItem, value: any) => {
    onUpdate({ [field]: value });
  }, [onUpdate]);

  const handleTypeChange = useCallback((newType: string) => {
    const updates: Partial<FieldItem> = {
      type: newType as FieldType,
      default_value: '', // Reset default value to avoid type mismatches
    };

    // Reset validation rules that might be incompatible
    const newValidation = { ...item.validation };

    // Clear numeric constraints
    if (newType !== 'number') {
      delete newValidation.min;
      delete newValidation.max;
    }

    // Reset require_reason to avoid format mismatch
    if (['number', 'date', 'datetime', 'select', 'multiselect'].includes(newType)) {
      newValidation.require_reason = [];
    } else {
      newValidation.require_reason = undefined;
    }

    updates.validation = newValidation;
    onUpdate(updates);
  }, [item.validation, onUpdate]);

  const handleDefaultValueChange = useCallback((val: any) => {
    handleChange('default_value', val);
  }, [handleChange]);

  const handleOptionsChange = useCallback((opts: NonNullable<FieldItem['options']>) => {
    handleChange('options', opts);
  }, [handleChange]);

  const handleValidationChange = useCallback((val: FieldItem['validation']) => {
    handleChange('validation', val);
  }, [handleChange]);

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor={`label-${item.id}`}>Label</Label>
        <Input
          id={`label-${item.id}`}
          value={item.label}
          onChange={(e) => {
            const val = e.target.value;
            handleChange('label', val);
          }}
          placeholder="Question or instruction"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`type-${item.id}`}>Type</Label>
          <Select value={item.type} onValueChange={handleTypeChange}>
            <SelectTrigger id={`type-${item.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FieldTypeEnum.options.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end pb-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`required-${item.id}`}
              checked={item.required}
              onCheckedChange={(checked) => handleChange('required', checked)}
            />
            <Label htmlFor={`required-${item.id}`} className="cursor-pointer">
              Required field
            </Label>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`desc-${item.id}`}>Description / Help Text</Label>
        <Textarea
          id={`desc-${item.id}`}
          value={item.description || ''}
          onChange={(e) => {
            const val = e.target.value;
            handleChange('description', val);
          }}
          placeholder="Detailed instructions for the operator..."
          className="h-20"
        />
      </div>

      {item.type !== 'file' && (
        <DefaultValueInput
          item={item}
          onChange={handleDefaultValueChange}
        />
      )}

      {(item.type === 'select' || item.type === 'multiselect') && (
        <OptionsEditor
          options={item.options || []}
          onChange={handleOptionsChange}
        />
      )}

      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-medium">Validation Rules</h4>
        <ValidationRulesEditor
          item={item}
          onChange={handleValidationChange}
        />
      </div>
    </div>
  );
});
FieldEditor.displayName = 'FieldEditor';
