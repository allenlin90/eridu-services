import type { SceneQcDailyItemDetail } from '@eridu/api-types/scene-qc';
import { Skeleton } from '@eridu/ui';

import type { useSceneQcReviewForm } from '../hooks/use-scene-qc-review-form';

import { SceneQcBlockedPanel } from './scene-qc-blocked-panel';
import { SceneQcEvidenceComparison } from './scene-qc-evidence-comparison';
import { SceneQcResultForm } from './scene-qc-result-form';

type SceneQcReviewFormController = ReturnType<typeof useSceneQcReviewForm>;

type SceneQcReviewPanelProps = {
  detail: SceneQcDailyItemDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  form: SceneQcReviewFormController;
  onSave: () => void;
};

/** §7.2 (5 right): orchestrates the comparison, inline form, and blocked panel for the selected Show. */
export function SceneQcReviewPanel({ detail, isLoading, isError, form, onSave }: SceneQcReviewPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex min-h-72 items-center justify-center p-6 text-sm text-destructive">
        Unable to load this Show's Scene QC context.
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="flex min-h-72 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Select a Show from the queue to begin review.
      </div>
    );
  }

  const isBlocked = detail.allowed_actions.blocked_reason === 'NO_EVIDENCE';
  const isConfirmed = detail.allowed_actions.blocked_reason === 'CONFIRMED';
  const isNotEligible = detail.allowed_actions.blocked_reason === 'NOT_ELIGIBLE';

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div>
        <h2 className="font-semibold">{detail.show.name}</h2>
        <p className="text-xs text-muted-foreground">
          {new Date(detail.show.scheduled_start_time).toLocaleString()}
          {detail.show.client ? ` · ${detail.show.client.name}` : ''}
        </p>
      </div>

      <SceneQcEvidenceComparison
        key={detail.show.id}
        evidence={detail.evidence}
        sceneProfile={detail.scene_profile}
      />

      {form.conflictMessage
        ? (
            <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <span>{form.conflictMessage}</span>
              <button type="button" className="underline" onClick={form.dismissConflict}>
                Dismiss
              </button>
            </div>
          )
        : null}

      {isBlocked
        ? (
            <SceneQcBlockedPanel />
          )
        : isConfirmed
          ? (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                This review has been confirmed and can no longer be edited.
              </div>
            )
          : isNotEligible
            ? (
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  This Show has moved outside the selected operational day and cannot be reviewed here. Select the
                  operational date it now falls on to review it.
                </div>
              )
            : (
                <SceneQcResultForm
                  result={form.result}
                  onResultChange={form.setResult}
                  feedback={form.feedback}
                  onFeedbackChange={form.setFeedback}
                  feedbackRequired={form.feedbackRequired}
                  feedbackMissing={form.feedbackMissing}
                  canSave={form.canSave}
                  isSaving={form.isSaving}
                  onSave={onSave}
                  onSelectUnusableImage={form.selectUnusableImage}
                />
              )}
    </div>
  );
}
