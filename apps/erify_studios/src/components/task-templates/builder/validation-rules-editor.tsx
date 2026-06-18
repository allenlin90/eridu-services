import { Plus, Trash2, X } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

import {
  Button,
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

import { EMPTY_ARRAY, FILE_TYPE_OPTIONS } from './field-editor.utils';
import type { FieldItem } from './schema';

/** Simple string-valued explanation rule for text/checkbox-style fields. */
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

/** Min/max constraints for number fields, with an inline min>max warning. */
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

/** Operator dropdown for a conditional explanation rule, scoped to the field type. */
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

/** Value input for a conditional explanation rule, matched to the field type/operator. */
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
        <ResponsiveDateTimePicker
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

/** Array-valued conditional explanation rules for number/date/select-style fields. */
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
          <div key={`${cond.op}-${String(cond.value)}`} className="flex gap-2 items-center">
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

/**
 * Dispatches the validation UI by field type: allowed file types for `file`,
 * a string explanation rule for text/textarea/url/checkbox, and number
 * constraints + conditional explanation rules for number/date/select-style
 * fields. Emits the next `validation` object via `onChange`.
 */
export const ValidationRulesEditor = memo(({
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
