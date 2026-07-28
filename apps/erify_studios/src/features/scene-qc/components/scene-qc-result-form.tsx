import type { SceneQcResult } from '@eridu/api-types/scene-qc';
import { Button, Textarea } from '@eridu/ui';

const RESULT_OPTIONS: Array<{ value: SceneQcResult; label: string }> = [
  { value: 'PASS', label: 'Pass' },
  { value: 'MINOR', label: 'Minor' },
  { value: 'FAIL', label: 'Fail' },
];

type SceneQcResultFormProps = {
  result: SceneQcResult | null;
  onResultChange: (result: SceneQcResult) => void;
  feedback: string;
  onFeedbackChange: (feedback: string) => void;
  feedbackRequired: boolean;
  feedbackMissing: boolean;
  canSave: boolean;
  isSaving: boolean;
  onSave: () => void;
  onSelectUnusableImage: () => void;
};

/** §7.2 (7-8): Pass/Minor/Fail, inline required feedback, unusable-image shortcut, Save & next. */
export function SceneQcResultForm({
  result,
  onResultChange,
  feedback,
  onFeedbackChange,
  feedbackRequired,
  feedbackMissing,
  canSave,
  isSaving,
  onSave,
  onSelectUnusableImage,
}: SceneQcResultFormProps) {
  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border bg-muted/30 p-1">
          {RESULT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={result === option.value ? 'secondary' : 'ghost'}
              aria-pressed={result === option.value}
              onClick={() => onResultChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onSelectUnusableImage}>
          Image blank or not viewable
        </Button>
      </div>

      {feedbackRequired
        ? (
            <div className="space-y-1">
              <Textarea
                value={feedback}
                onChange={(event) => onFeedbackChange(event.target.value)}
                placeholder="Describe the issue"
                aria-invalid={feedbackMissing}
                aria-label="Feedback"
              />
              {feedbackMissing
                ? <p className="text-xs text-destructive">Feedback is required for Minor and Fail results.</p>
                : null}
            </div>
          )
        : null}

      <div className="flex justify-end">
        <Button type="button" onClick={onSave} disabled={!canSave || isSaving}>
          {isSaving ? 'Saving...' : 'Save & next'}
        </Button>
      </div>
    </div>
  );
}
