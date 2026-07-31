import { useState } from 'react';

import type {
  SceneQcFindingInput,
  SceneQcResult,
  SceneQcTaxonomy,
  SceneType,
} from '@eridu/api-types/scene-qc';
import { Button, Textarea } from '@eridu/ui';

import { SceneQcIssuePicker } from './scene-qc-issue-picker';
import { SceneQcTaxonomyDialog } from './scene-qc-taxonomy-dialog';

const RESULT_OPTIONS: Array<{ value: SceneQcResult; label: string }> = [
  { value: 'PASS', label: 'Pass' },
  { value: 'MINOR', label: 'Minor' },
  { value: 'FAIL', label: 'Fail' },
];

type SceneQcResultFormProps = {
  studioId: string;
  result: SceneQcResult | null;
  onResultChange: (result: SceneQcResult) => void;
  feedback: string;
  onFeedbackChange: (feedback: string) => void;
  findings: SceneQcFindingInput[];
  onFindingsChange: (findings: SceneQcFindingInput[]) => void;
  findingsMissing: boolean;
  taxonomy: SceneQcTaxonomy | undefined;
  sceneType: SceneType | null;
  canSave: boolean;
  isSaving: boolean;
  onSave: () => void;
  onSelectUnusableImage: () => void;
};

/** §7.2 (7-8): Pass/Minor/Fail, inline required feedback, unusable-image shortcut, Save & next. */
export function SceneQcResultForm({
  studioId,
  result,
  onResultChange,
  feedback,
  onFeedbackChange,
  findings,
  onFindingsChange,
  findingsMissing,
  taxonomy,
  sceneType,
  canSave,
  isSaving,
  onSave,
  onSelectUnusableImage,
}: SceneQcResultFormProps) {
  const [taxonomyOpen, setTaxonomyOpen] = useState(false);
  const needsFindings = result === 'MINOR' || result === 'FAIL';
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

      {needsFindings
        ? (
            <SceneQcIssuePicker
              taxonomy={taxonomy}
              sceneType={sceneType}
              findings={findings}
              onChange={onFindingsChange}
              onManage={() => setTaxonomyOpen(true)}
              missing={findingsMissing}
            />
          )
        : null}

      <div className="space-y-1">
        <Textarea
          value={feedback}
          onChange={(event) => onFeedbackChange(event.target.value)}
          placeholder="Optional note"
          aria-label="Optional note"
        />
        <p className="text-xs text-muted-foreground">Add context only when it helps; issue classification is structured above.</p>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={onSave} disabled={!canSave || isSaving}>
          {isSaving ? 'Saving...' : 'Save & next'}
        </Button>
      </div>

      {taxonomyOpen
        ? (
            <SceneQcTaxonomyDialog
              studioId={studioId}
              taxonomy={taxonomy}
              open
              onOpenChange={setTaxonomyOpen}
            />
          )
        : null}
    </div>
  );
}
