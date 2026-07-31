import { Info } from 'lucide-react';
import { memo } from 'react';

import {
  Badge,
  Button,
  Checkbox,
  Label,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

type SceneQcEvidenceToggleProps = {
  id: string;
  checked: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onChange: (next: boolean) => void;
};

/**
 * Presentational toggle for `evidence_purpose: 'scene_qc'`. Authorization
 * note: nothing here changes who may designate evidence -- it rides the
 * existing Task Template permissions (StudioTaskTemplateController's write
 * routes); no Scene QC role check belongs in the builder.
 */
export const SceneQcEvidenceToggle = memo(({
  id,
  checked,
  disabled,
  disabledReason,
  onChange,
}: SceneQcEvidenceToggleProps) => {
  return (
    <div
      className={cn(
        'space-y-2 rounded-md border p-3 transition-colors',
        checked
          ? 'border-violet-300 bg-violet-50/70 dark:border-violet-700 dark:bg-violet-950/30'
          : 'border-border bg-muted/20',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(next) => onChange(next === true)}
        />
        <Label htmlFor={id} className={cn(disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
          Use as Scene QC evidence
        </Label>
        {checked && (
          <Badge
            variant="outline"
            className="border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200"
          >
            Shared with Scene QC
          </Badge>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              aria-label="What does Scene QC evidence mean?"
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Scene QC is separate from Manager Review. This setting tells Scene QC exactly which submitted image to compare with the Client Scene Profile.
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="text-xs text-muted-foreground">
        {checked
          ? 'Uploads to this field also appear in the separate Scene Review workspace for Designer, Manager, and Admin. Manager Review approval is not required.'
          : 'Enable only for the screenshot that Scene QC reviewers should inspect. This does not change Task submission or Manager Review.'}
      </p>
      {disabled && disabledReason && (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      )}
    </div>
  );
});
SceneQcEvidenceToggle.displayName = 'SceneQcEvidenceToggle';
