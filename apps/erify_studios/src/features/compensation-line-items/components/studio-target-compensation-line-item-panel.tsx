import { Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type {
  CompensationLineItemApiResponse,
  CreateStudioCompensationLineItemInput,
} from '@eridu/api-types/compensation-line-items';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';

import {
  useStudioCompensationLineItems,
} from '@/features/compensation-line-items/api/compensation-line-items.api';
import {
  useCreateStudioCompensationLineItem,
  useDeleteStudioCompensationLineItem,
  useUpdateStudioCompensationLineItem,
} from '@/features/compensation-line-items/hooks/use-compensation-line-item-mutations';
import { toMoneyString } from '@/features/compensation-line-items/utils/money-input';

type StudioTargetCompensationLineItemPanelProps = {
  studioId: string;
  targetType: CreateStudioCompensationLineItemInput['target_type'];
  targetId: string;
  title: string;
  description?: string;
  enabled?: boolean;
  invalidateShiftWorkflow?: boolean;
  shiftId?: string;
};

const ITEM_TYPE_OPTIONS = [
  { value: 'BONUS', label: 'Bonus' },
  { value: 'ALLOWANCE', label: 'Allowance' },
  { value: 'OVERTIME', label: 'Overtime' },
  { value: 'DEDUCTION', label: 'Deduction' },
  { value: 'OTHER', label: 'Other' },
] as const;

type ItemType = (typeof ITEM_TYPE_OPTIONS)[number]['value'];

const KNOWN_ITEM_TYPES = new Set<string>(ITEM_TYPE_OPTIONS.map((option) => option.value));

function coerceItemType(value: string): ItemType {
  return KNOWN_ITEM_TYPES.has(value) ? (value as ItemType) : 'OTHER';
}

export function StudioTargetCompensationLineItemPanel({
  studioId,
  targetType,
  targetId,
  title,
  description,
  enabled = true,
  invalidateShiftWorkflow = false,
  shiftId,
}: StudioTargetCompensationLineItemPanelProps) {
  const [editingItem, setEditingItem] = useState<CompensationLineItemApiResponse | null>(null);
  const [amount, setAmount] = useState('');
  const [itemType, setItemType] = useState<ItemType>('BONUS');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const lineItemsQuery = useStudioCompensationLineItems(
    studioId,
    {
      target_type: targetType,
      target_id: targetId,
      limit: 100,
      sort: 'asc',
    },
    enabled && Boolean(studioId && targetId),
  );

  const mutationContext = { studioId, invalidateShiftWorkflow, shiftId };
  const createLineItem = useCreateStudioCompensationLineItem(mutationContext);
  const updateLineItem = useUpdateStudioCompensationLineItem(mutationContext);
  const deleteLineItem = useDeleteStudioCompensationLineItem(mutationContext);

  const resetForm = () => {
    setEditingItem(null);
    setAmount('');
    setItemType('BONUS');
    setReason('');
    setFormError(null);
  };

  const handleEdit = (lineItem: CompensationLineItemApiResponse) => {
    setEditingItem(lineItem);
    setAmount(lineItem.amount);
    setItemType(coerceItemType(lineItem.item_type));
    setReason(lineItem.reason);
    setFormError(null);
  };

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();
    if (!amount.trim() || !trimmedReason) {
      setFormError('Amount and reason are required.');
      return;
    }

    let normalizedAmount: string;
    try {
      normalizedAmount = toMoneyString(amount);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Invalid amount.');
      return;
    }

    if (editingItem) {
      await updateLineItem.mutateAsync({
        id: editingItem.id,
        data: {
          amount: normalizedAmount,
          item_type: itemType,
          reason: trimmedReason,
        },
      });
      resetForm();
      return;
    }

    await createLineItem.mutateAsync({
      target_type: targetType,
      target_id: targetId,
      amount: normalizedAmount,
      item_type: itemType,
      reason: trimmedReason,
    });
    resetForm();
  };

  const isSaving = createLineItem.isPending || updateLineItem.isPending;
  const lineItems = lineItemsQuery.data?.data ?? [];

  return (
    <section
      className="space-y-3 rounded-md border p-3"
      data-testid={`line-item-panel-${targetType}-${targetId}`}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>

      <div className="space-y-2">
        {lineItems.length === 0 && (
          <p className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
            No adjustment items yet.
          </p>
        )}
        {lineItems.map((lineItem) => (
          <div key={lineItem.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{lineItem.reason}</p>
              <p className="text-xs text-muted-foreground">
                {lineItem.item_type}
                {' '}
                ·
                {' '}
                {lineItem.amount}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Edit compensation item ${lineItem.reason}`}
                onClick={() => handleEdit(lineItem)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete compensation item ${lineItem.reason}`}
                onClick={() => deleteLineItem.mutate(lineItem.id)}
                disabled={deleteLineItem.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${targetType}-${targetId}-amount`}>Amount</Label>
          <Input
            id={`${targetType}-${targetId}-amount`}
            type="number"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${targetType}-${targetId}-item-type`}>Item Type</Label>
          <Select value={itemType} onValueChange={(value) => setItemType(value as ItemType)}>
            <SelectTrigger id={`${targetType}-${targetId}-item-type`}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {ITEM_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor={`${targetType}-${targetId}-reason`}>Reason</Label>
          <Textarea
            id={`${targetType}-${targetId}-reason`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
          />
        </div>
      </div>

      {formError && <p className="text-xs font-medium text-destructive">{formError}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        {editingItem && (
          <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving}>
            Cancel edit
          </Button>
        )}
        <Button type="button" onClick={() => void handleSubmit()} disabled={isSaving}>
          {editingItem ? 'Update item' : 'Create item'}
        </Button>
      </div>
    </section>
  );
}
