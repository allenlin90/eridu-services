import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SceneQcDailyItemDetail, SceneQcResult } from '@eridu/api-types/scene-qc';

import { useCreateSceneQcReview, useUpdateSceneQcReview } from '../api/save-scene-qc-review';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';

function isConflict(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409;
}

type UseSceneQcReviewFormParams = {
  studioId: string;
  showId: string | undefined;
  operationalDate: string;
  detail: SceneQcDailyItemDetail | undefined;
  refetchDetail?: () => Promise<unknown>;
  onSaved?: () => void;
};

/**
 * Local draft form state for the inline Pass/Minor/Fail result form. Resets
 * on `show_id` change only -- never on evidence/expected-reference
 * re-resolution (§12.3). Uses the "latest ref" guard already established in
 * `use-scene-profile-editor.ts` so a slow in-flight save cannot clobber a
 * newer Show selection. See SCENE_QC_CHILD_PR_3_BREAKDOWN.md section 3.3.
 */
export function useSceneQcReviewForm({
  studioId,
  showId,
  operationalDate,
  detail,
  refetchDetail,
  onSaved,
}: UseSceneQcReviewFormParams) {
  const review = detail?.review ?? null;
  const createMutation = useCreateSceneQcReview(studioId);
  const updateMutation = useUpdateSceneQcReview(studioId, review?.id);

  const [result, setResult] = useState<SceneQcResult | null>(null);
  const [feedback, setFeedback] = useState('');
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const showIdRef = useRef(showId);
  showIdRef.current = showId;

  const initializedForShowRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (initializedForShowRef.current === showId) {
      return;
    }
    initializedForShowRef.current = showId;
    setResult(review?.result ?? null);
    setFeedback(review?.feedback ?? '');
    setConflictMessage(null);
    // Intentionally NOT depending on review.result/feedback beyond this
    // Show-change reset -- a later re-resolution of evidence/expected
    // reference for the SAME Show must not clobber a typed draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  const dismissConflict = useCallback(() => setConflictMessage(null), []);

  const save = useCallback(async () => {
    if (!showId || !result) {
      return;
    }
    const targetShowId = showId;
    setConflictMessage(null);
    try {
      if (review) {
        await updateMutation.mutateAsync({ result, feedback: feedback.trim() || null, version: review.version });
      } else {
        await createMutation.mutateAsync({
          show_id: showId,
          operational_date: operationalDate,
          result,
          feedback: feedback.trim() || null,
        });
      }
      if (showIdRef.current !== targetShowId) {
        // The operator switched Shows while this save was in flight -- the
        // Show-change effect already reset the draft; discard this result
        // rather than surfacing a stale success for the new selection.
        return;
      }
      onSaved?.();
    } catch (err) {
      if (showIdRef.current !== targetShowId) {
        return;
      }
      if (isConflict(err)) {
        // Preserve the typed feedback locally, refetch the current review,
        // and require an explicit retry -- never auto-retry (§7.3).
        setConflictMessage(
          getMutationErrorMessage(err, 'This review changed since you loaded it. Refresh and try again.'),
        );
        void refetchDetail?.();
        return;
      }
      throw err;
    }
  }, [showId, result, feedback, review, updateMutation, createMutation, operationalDate, onSaved, refetchDetail]);

  /** "Image blank or not viewable": selects Fail and focuses feedback. Never auto-saves (§7.2/§12.3). */
  const selectUnusableImage = useCallback(() => {
    setResult('FAIL');
  }, []);

  const feedbackRequired = result === 'MINOR' || result === 'FAIL';
  const feedbackMissing = feedbackRequired && feedback.trim().length === 0;
  const dirty = result !== (review?.result ?? null) || feedback !== (review?.feedback ?? '');

  return {
    result,
    setResult,
    feedback,
    setFeedback,
    feedbackRequired,
    feedbackMissing,
    dirty,
    isSaving: createMutation.isPending || updateMutation.isPending,
    conflictMessage,
    dismissConflict,
    save,
    selectUnusableImage,
    canSave: result !== null && !feedbackMissing,
  };
}
