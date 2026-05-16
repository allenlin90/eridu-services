import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@eridu/ui';

import { ShiftBlockActualsInput } from '@/components/finance/shift-block-actuals-input';
import { StudioTargetCompensationLineItemPanel } from '@/features/compensation-line-items/components/studio-target-compensation-line-item-panel';
import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import { useUpdateStudioShiftBlock } from '@/features/studio-shifts/api/update-studio-shift-block';
import { sortShiftBlocksByStart } from '@/features/studio-shifts/utils/shift-blocks.utils';
import { formatDateTime } from '@/features/studio-shifts/utils/shift-form.utils';
import { toDecimalDisplayString } from '@/lib/decimal-format';

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
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">Hourly rate</p>
                <p className="text-lg font-semibold">
                  {formatMoneyString(shift.hourly_rate)}
                  <span className="text-sm font-normal text-muted-foreground">/hr</span>
                </p>
              </div>
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
