import { Info } from 'lucide-react';
import { memo, useCallback } from 'react';

import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@eridu/ui';

import { DefaultValueInput } from './default-value-input';
import {
  EXPLANATION_REQUIRED_FACT_KEYS,
  getSystemFactKey,
  SYSTEM_FACT_NONE_VALUE,
} from './field-editor.utils';
import { OptionsEditor } from './options-editor';
import type { FieldItem, FieldType, SystemFactKey } from './schema';
import { FieldTypeEnum, isSharedField, SYSTEM_FACT_KEY_DEFINITIONS } from './schema';
import { SystemFactCombobox } from './system-fact-combobox';
import { ValidationRulesEditor } from './validation-rules-editor';

type FieldEditorProps = {
  item: FieldItem;
  onUpdate: (updates: Partial<FieldItem>) => void;
};

/**
 * Per-field configuration form for the template builder. This component owns
 * the field-level mutation rules; the input surfaces it renders are pure
 * presentation extracted into sibling modules:
 *
 *   FieldEditor (label/type/system-fact/required + mutation rules)
 *   ├─ SystemFactCombobox ....... bind a record column (auto-fill)
 *   ├─ DefaultValueInput ........ type-matched default value control
 *   ├─ OptionsEditor ............ select/multiselect option list
 *   └─ ValidationRulesEditor .... file types / explanation / number+condition rules
 *
 * The non-obvious behavior lives in the type/system-fact change handlers:
 * changing the type resets the default value and reshapes `require_reason`
 * (string vs condition-array) to match the new type, and binding a system fact
 * overrides the type and clears incompatible validation. Constants and pure
 * helpers live in `field-editor.utils.ts`.
 */
export const FieldEditor = memo(({ item, onUpdate }: FieldEditorProps) => {
  const handleChange = useCallback((field: keyof FieldItem, value: any) => {
    onUpdate({ [field]: value });
  }, [onUpdate]);

  const fieldIsShared = isSharedField(item);

  const handleTypeChange = useCallback((newType: string) => {
    if (fieldIsShared) {
      return;
    }

    const systemFactKey = getSystemFactKey(item);
    const systemFactDefinition = systemFactKey ? SYSTEM_FACT_KEY_DEFINITIONS[systemFactKey] : undefined;
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
    if (systemFactDefinition && systemFactDefinition.field_type !== newType) {
      updates.system_fact_key = undefined;
    }
    onUpdate(updates);
  }, [fieldIsShared, item, onUpdate]);

  const handleSystemFactChange = useCallback((value: string) => {
    if (fieldIsShared) {
      return;
    }

    if (value === SYSTEM_FACT_NONE_VALUE) {
      onUpdate({ system_fact_key: undefined });
      return;
    }

    const systemFactKey = value as SystemFactKey;
    const definition = SYSTEM_FACT_KEY_DEFINITIONS[systemFactKey];
    const validation = { ...item.validation };
    delete validation.min;
    delete validation.max;
    if (EXPLANATION_REQUIRED_FACT_KEYS.has(systemFactKey)) {
      validation.require_reason = 'on-true';
    } else {
      delete validation.require_reason;
    }

    onUpdate({
      system_fact_key: systemFactKey,
      type: definition.field_type,
      default_value: '',
      validation,
    });
  }, [fieldIsShared, item.validation, onUpdate]);

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
          <Select value={item.type} onValueChange={handleTypeChange} disabled={fieldIsShared}>
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
          {fieldIsShared && (
            <p className="text-xs text-muted-foreground">
              Shared-field type is locked by studio settings.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor={`system-fact-${item.id}`}>Auto-fill record field</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  aria-label="What does auto-fill record field mean?"
                >
                  <Info className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                When the operator submits this task, their answer also updates the matching field on the show, creator, or platform record. Each record field can be auto-filled by one task field per template.
              </TooltipContent>
            </Tooltip>
          </div>
          <SystemFactCombobox
            id={`system-fact-${item.id}`}
            value={getSystemFactKey(item)}
            onChange={handleSystemFactChange}
            disabled={fieldIsShared}
          />
          {fieldIsShared && (
            <p className="text-xs text-muted-foreground">
              Shared fields cannot be bound to a record field; the type is locked by studio settings.
            </p>
          )}
          {!fieldIsShared && getSystemFactKey(item) && (
            <p className="text-xs text-muted-foreground">
              This answer will update the matching show, creator, or platform value later.
            </p>
          )}
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
