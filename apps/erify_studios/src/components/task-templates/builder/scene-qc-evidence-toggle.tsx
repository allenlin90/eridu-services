import { Info } from 'lucide-react';
import { memo } from 'react';

import {
  Button,
  Checkbox,
  Label,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@eridu/ui';

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
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(next) => onChange(next === true)}
        />
        <Label htmlFor={id} className="cursor-pointer">
          Use as Scene QC evidence
        </Label>
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
            Reviewers compare uploads to this field against the Client's expected-scene reference during Scene QC.
          </TooltipContent>
        </Tooltip>
      </div>
      {disabled && disabledReason && (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      )}
    </div>
  );
});
SceneQcEvidenceToggle.displayName = 'SceneQcEvidenceToggle';
