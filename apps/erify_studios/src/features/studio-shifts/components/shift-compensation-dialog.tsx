import { Edit2, Loader2, X } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@eridu/ui';

import { ShiftBlockActualsInput } from '@/components/finance/shift-block-actuals-input';
import { StudioTargetCompensationLineItemPanel } from '@/features/compensation-line-items/components/studio-target-compensation-line-item-panel';
import { toMoneyString } from '@/features/compensation-line-items/utils/money-input';
import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import { useUpdateStudioShift } from '@/features/studio-shifts/api/update-studio-shift';
import { useUpdateStudioShiftBlock } from '@/features/studio-shifts/api/update-studio-shift-block';
import { sortShiftBlocksByStart } from '@/features/studio-shifts/utils/shift-blocks.utils';
import { formatDateTime } from '@/features/studio-shifts/utils/shift-form.utils';
import { getApiErrorMessage } from '@/features/studio-shifts/utils/studio-shifts-table.utils';
import { toDecimalDisplayString } from '@/lib/decimal-format';

const OVERRIDE_REASON_MAX_LENGTH = 1000;

type ShiftCompensationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  shift: StudioShift | null;
};

function formatMoneyString(value: string): string {
  const formatted = toDecimalDisplayString(value);
  if (formatted.startsWith('-')) {
    return `-$${formatted.slice(1)}`;
  }
  return `$${formatted}`;
}

type HourlyRateTileProps = {
  studioId: string;
  shift: StudioShift;
};

// Keyed by shift.id from the parent so React remounts (and resets editor state)
// when the dialog opens against a different shift.
function HourlyRateTile({ studioId, shift }: HourlyRateTileProps) {
  const updateShift = useUpdateStudioShift(studioId);
  const storedRate = shift.hourly_rate;
  const normalizedStoredRate = toMoneyString(storedRate);

  const [isEditing, setIsEditing] = useState(false);
  const [rateInput, setRateInput] = useState(normalizedStoredRate);
  const [reasonInput, setReasonInput] = useState('');
  const [rateError, setRateError] = useState<string | null>(null);

  const trimmedReason = reasonInput.trim();
  const normalizedInputRate = (() => {
    if (!isEditing || !rateInput.trim()) {
      return null;
    }
    try {
      return toMoneyString(rateInput);
    } catch {
      return null;
    }
  })();
  const rateChanged = normalizedInputRate !== null && normalizedInputRate !== normalizedStoredRate;
  const saveDisabled
    = updateShift.isPending
    || !rateInput.trim()
    || normalizedInputRate === null
    || (rateChanged && trimmedReason.length === 0);

  function handleStartEdit() {
    setIsEditing(true);
    setRateInput(normalizedStoredRate);
    setReasonInput('');
    setRateError(null);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setRateInput(normalizedStoredRate);
    setReasonInput('');
    setRateError(null);
  }

  async function handleSaveRate() {
    let normalizedRate: string;
    try {
      normalizedRate = toMoneyString(rateInput);
    } catch (error) {
      setRateError(error instanceof Error ? error.message : 'Invalid hourly rate');
      return;
    }

    if (normalizedRate === normalizedStoredRate) {
      // Same rate — no PATCH, no audit entry. Just close edit mode.
      handleCancelEdit();
      return;
    }

    if (trimmedReason.length === 0) {
      setRateError('A reason is required when changing the hourly rate.');
      return;
    }

    try {
      await updateShift.mutateAsync({
        shiftId: shift.id,
        payload: {
          hourly_rate: Number(normalizedRate),
          override_reason: trimmedReason,
        },
      });
      handleCancelEdit();
    } catch (error) {
      setRateError(getApiErrorMessage(error, 'Failed to update hourly rate. Please try again.'));
    }
  }

  return (
    <div data-testid="shift-hourly-rate-tile" className="rounded-md border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Hourly rate</p>
        {!isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mr-1 -mt-1"
            aria-label="Edit hourly rate"
            onClick={handleStartEdit}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {!isEditing
        ? (
            <p className="text-lg font-semibold">
              {formatMoneyString(storedRate)}
              <span className="text-sm font-normal text-muted-foreground">/hr</span>
            </p>
          )
        : (
            <div className="mt-1 space-y-2">
              <div className="space-y-1">
                <Label htmlFor="shift-comp-rate" className="text-xs">Hourly rate</Label>
                <Input
                  id="shift-comp-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={rateInput}
                  onChange={(event) => setRateInput(event.target.value)}
                  disabled={updateShift.isPending}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="shift-comp-reason" className="text-xs">
                  Reason
                  {' '}
                  {rateChanged ? <span className="text-destructive">*</span> : null}
                </Label>
                <Textarea
                  id="shift-comp-reason"
                  placeholder="Why is this rate being changed?"
                  value={reasonInput}
                  onChange={(event) => setReasonInput(event.target.value)}
                  maxLength={OVERRIDE_REASON_MAX_LENGTH}
                  rows={2}
                  disabled={updateShift.isPending}
                />
              </div>
              {rateError && (
                <p className="text-xs font-medium text-destructive">{rateError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={updateShift.isPending}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveRate}
                  disabled={saveDisabled}
                >
                  {updateShift.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          )}
    </div>
  );
}

export function ShiftCompensationDialog({
  open,
  onOpenChange,
  studioId,
  shift,
}: ShiftCompensationDialogProps) {
  const updateBlockActuals = useUpdateStudioShiftBlock(studioId);
  const sortedBlocks = shift ? sortShiftBlocksByStart(shift.blocks) : [];

  return (
    <Dialog open={open && Boolean(shift)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[920px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Shift Compensation</DialogTitle>
          <DialogDescription>
            {shift
              ? `${shift.user_name} · ${shift.date}`
              : 'Shift compensation inputs'}
          </DialogDescription>
        </DialogHeader>

        {shift && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <HourlyRateTile key={shift.id} studioId={studioId} shift={shift} />
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">Planned</p>
                <p className="text-lg font-semibold">{formatMoneyString(shift.planned_cost)}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">Actual</p>
                {shift.actual_cost === null
                  ? <p className="text-lg font-semibold text-muted-foreground">Pending</p>
                  : <p className="text-lg font-semibold">{formatMoneyString(shift.actual_cost)}</p>}
              </div>
            </div>

            <StudioTargetCompensationLineItemPanel
              studioId={studioId}
              targetType="STUDIO_SHIFT"
              targetId={shift.id}
              title="Shift adjustments"
              description="Supplemental items attached to the whole shift."
              invalidateShiftWorkflow
            />

            {sortedBlocks.map((block, index) => (
              <section key={block.id} className="space-y-3 rounded-md border bg-background p-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">
                    Block
                    {' '}
                    {index + 1}
                    {' '}
                    actuals
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(block.start_time)}
                    {' '}
                    -
                    {' '}
                    {formatDateTime(block.end_time)}
                  </p>
                </div>

                <ShiftBlockActualsInput
                  key={`${block.id}-${block.actual_start_time ?? 'none'}-${block.actual_end_time ?? 'none'}`}
                  block={block}
                  isSubmitting={updateBlockActuals.isPending}
                  onSubmit={(payload) =>
                    updateBlockActuals.mutateAsync({
                      shiftId: shift.id,
                      blockId: block.id,
                      payload,
                    })}
                />

                <StudioTargetCompensationLineItemPanel
                  studioId={studioId}
                  targetType="STUDIO_SHIFT_BLOCK"
                  targetId={block.id}
                  title={`Block ${index + 1} adjustments`}
                  description="Supplemental items attached to this shift block."
                  invalidateShiftWorkflow
                />
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
