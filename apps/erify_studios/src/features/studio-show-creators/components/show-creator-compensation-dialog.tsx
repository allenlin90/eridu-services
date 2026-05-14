import { Edit2, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { CompensationLineItemApiResponse } from '@eridu/api-types/compensation-line-items';
import type { StudioShowCreatorListItem } from '@eridu/api-types/studio-creators';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useShowCreatorCompensationSummary } from '@/features/studio-show-creators/api/get-show-creators';

type ShowCreatorCompensationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  showId: string;
  creator: StudioShowCreatorListItem | null;
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

const UNRESOLVED_REASON_COPY: Record<string, string> = {
  AGREEMENT_SNAPSHOT_MISSING:
    'Compensation terms are missing from this assignment. Edit the assignment to set rate, type, or commission before totals can be calculated.',
  COMMISSION_REVENUE_NOT_AVAILABLE:
    'Commission-based pay cannot be totaled until show revenue is recorded.',
};

const MONEY_INPUT_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/;

function formatOptionalAmount(value: string | null | undefined) {
  return value ?? 'Unresolved';
}

function formatUnresolvedReason(code: string): string {
  return UNRESOLVED_REASON_COPY[code] ?? code;
}

function coerceItemType(value: string): ItemType {
  return KNOWN_ITEM_TYPES.has(value) ? (value as ItemType) : 'OTHER';
}

/**
 * Normalizes a typed money string to two-decimal form without going through a binary float.
 * Accepts an optional leading sign and an optional decimal portion. Extra precision is
 * rounded half-away-from-zero on the cent boundary so `1.239` becomes `1.24` rather than
 * silently dropping the `9`. Rejects anything that does not match the numeric pattern.
 */
function toMoneyString(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(MONEY_INPUT_PATTERN);
  if (!match) {
    throw new TypeError('Amount must be a number');
  }
  const sign = match[1] ?? '';
  const whole = match[2];
  const fraction = match[3] ?? '';

  if (fraction.length <= 2) {
    const padded = (`${fraction}00`).slice(0, 2);
    return `${sign}${whole}.${padded}`;
  }

  const firstTwo = fraction.slice(0, 2);
  const roundingDigit = fraction.charCodeAt(2) - 48;
  if (roundingDigit < 5) {
    return `${sign}${whole}.${firstTwo}`;
  }

  // Round half-away-from-zero. Use BigInt so a 99 → 100 carry pushes into the whole part.
  const combined = (BigInt(whole) * 100n) + BigInt(firstTwo) + 1n;
  const newWhole = (combined / 100n).toString();
  const newCents = (combined % 100n).toString().padStart(2, '0');
  return `${sign}${newWhole}.${newCents}`;
}

export function ShowCreatorCompensationDialog({
  open,
  onOpenChange,
  studioId,
  showId,
  creator,
}: ShowCreatorCompensationDialogProps) {
  const [editingItem, setEditingItem] = useState<CompensationLineItemApiResponse | null>(null);
  const [amount, setAmount] = useState('');
  const [itemType, setItemType] = useState<ItemType>('BONUS');
  const [reason, setReason] = useState('');

  const targetId = creator?.id ?? '';
  const summaryQuery = useShowCreatorCompensationSummary(studioId, showId);
  const lineItemsQuery = useStudioCompensationLineItems(
    studioId,
    {
      target_type: 'SHOW_CREATOR',
      target_id: targetId,
      limit: 100,
      sort: 'asc',
    },
    open && Boolean(studioId && targetId),
  );

  const createLineItem = useCreateStudioCompensationLineItem({ studioId, showId });
  const updateLineItem = useUpdateStudioCompensationLineItem({ studioId, showId });
  const deleteLineItem = useDeleteStudioCompensationLineItem({ studioId, showId });

  const creatorSummary = useMemo(() => {
    return summaryQuery.data?.creators.find((item) => item.show_creator_id === targetId) ?? null;
  }, [summaryQuery.data?.creators, targetId]);

  const resetForm = () => {
    setEditingItem(null);
    setAmount('');
    setItemType('BONUS');
    setReason('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleEdit = (lineItem: CompensationLineItemApiResponse) => {
    setEditingItem(lineItem);
    setAmount(lineItem.amount);
    setItemType(coerceItemType(lineItem.item_type));
    setReason(lineItem.reason);
  };

  const handleSubmit = async () => {
    if (!creator) {
      return;
    }
    const trimmedReason = reason.trim();
    if (!amount.trim() || !trimmedReason) {
      toast.error('Amount and reason are required');
      return;
    }

    let normalizedAmount;
    try {
      normalizedAmount = toMoneyString(amount);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid amount');
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
      toast.success('Compensation item updated');
      resetForm();
      return;
    }

    await createLineItem.mutateAsync({
      target_type: 'SHOW_CREATOR',
      target_id: creator.id,
      amount: normalizedAmount,
      item_type: itemType,
      reason: trimmedReason,
    });
    toast.success('Compensation item created');
    resetForm();
  };

  const isSaving = createLineItem.isPending || updateLineItem.isPending;
  const lineItems = lineItemsQuery.data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[860px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Creator Compensation</DialogTitle>
          <DialogDescription>
            {creator?.creator_name ?? 'Creator'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Base</p>
              <p className="font-medium">{formatOptionalAmount(creatorSummary?.base_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Adjustments</p>
              <p className="font-medium">{creatorSummary?.adjustment_total ?? '0.00'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Creator Total</p>
              <p className="font-medium">{formatOptionalAmount(creatorSummary?.total_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Show Total</p>
              <p className="font-medium">{summaryQuery.data?.total_amount ?? '0.00'}</p>
            </div>
          </div>

          {creatorSummary?.unresolved_reason && (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              {formatUnresolvedReason(creatorSummary.unresolved_reason)}
            </p>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Adjustment Items</p>
            {lineItems.length === 0 && (
              <p className="rounded-md border p-3 text-sm text-muted-foreground">
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

          <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="show-creator-line-item-amount">Amount</Label>
              <Input
                id="show-creator-line-item-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="show-creator-line-item-type">Item Type</Label>
              <Select value={itemType} onValueChange={(value) => setItemType(value as ItemType)}>
                <SelectTrigger id="show-creator-line-item-type">
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
              <Label htmlFor="show-creator-line-item-reason">Reason</Label>
              <Textarea
                id="show-creator-line-item-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          {editingItem && (
            <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving}>
              Cancel Edit
            </Button>
          )}
          <Button type="button" onClick={() => void handleSubmit()} disabled={isSaving}>
            {isSaving ? 'Saving...' : editingItem ? 'Update Item' : 'Create Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
