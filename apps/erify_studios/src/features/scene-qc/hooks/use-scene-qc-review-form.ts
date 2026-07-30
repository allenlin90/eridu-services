import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  SceneQcDailyItemDetail,
  SceneQcFindingInput,
  SceneQcResult,
} from '@eridu/api-types/scene-qc';

import { useSceneQcTaxonomyQuery } from '../api/get-scene-qc-taxonomy';
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
 * re-resolution. Uses the "latest ref" guard already established in
 * `use-scene-profile-editor.ts` so a slow in-flight save cannot clobber a
 * newer Show selection. See "Daily Review" in
 * apps/erify_studios/docs/SCENE_QC.md.
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
  const taxonomyQuery = useSceneQcTaxonomyQuery(studioId);

  const [result, setResult] = useState<SceneQcResult | null>(null);
  const [feedback, setFeedback] = useState('');
  const [findings, setFindings] = useState<SceneQcFindingInput[]>([]);
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
    setFindings((review?.findings ?? []).map((finding) => ({
      element_id: finding.element_id,
      defect_id: finding.defect_id,
      related_element_id: finding.related_element_id,
    })));
    setConflictMessage(null);
    // Intentionally NOT depending on review.result/feedback beyond this
    // Show-change reset -- a later re-resolution of evidence/expected
    // reference for the SAME Show must not clobber a typed draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  const dismissConflict = useCallback(() => setConflictMessage(null), []);
  const changeResult = useCallback((next: SceneQcResult) => {
    setResult(next);
    if (next === 'PASS') {
      setFindings([]);
    }
  }, []);

  /** Returns `true` on a successful save, `false` on a handled conflict (never rethrown) -- lets callers chain "Save & next" only on success. */
  const save = useCallback(async (): Promise<boolean> => {
    if (!showId || !result) {
      return false;
    }
    const targetShowId = showId;
    setConflictMessage(null);
    try {
      if (review) {
        await updateMutation.mutateAsync({
          result,
          feedback: feedback.trim() || null,
          findings,
          version: review.version,
        });
      } else {
        await createMutation.mutateAsync({
          show_id: showId,
          operational_date: operationalDate,
          result,
          feedback: feedback.trim() || null,
          findings,
        });
      }
      if (showIdRef.current !== targetShowId) {
        // The operator switched Shows while this save was in flight -- the
        // Show-change effect already reset the draft; discard this result
        // rather than surfacing a stale success for the new selection.
        return false;
      }
      onSaved?.();
      return true;
    } catch (err) {
      if (showIdRef.current !== targetShowId) {
        return false;
      }
      if (isConflict(err)) {
        // Preserve the typed feedback locally, refetch the current review,
        // and require an explicit retry -- never auto-retry (§7.3).
        setConflictMessage(
          getMutationErrorMessage(err, 'This review changed since you loaded it. Refresh and try again.'),
        );
        void refetchDetail?.();
        return false;
      }
      throw err;
    }
  }, [showId, result, feedback, findings, review, updateMutation, createMutation, operationalDate, onSaved, refetchDetail]);

  /** "Image blank or not viewable": selects Fail and focuses feedback. Never auto-saves (§7.2/§12.3). */
  const selectUnusableImage = useCallback(() => {
    setResult('FAIL');
  }, []);

  const findingsRequired = result === 'MINOR' || result === 'FAIL';
  const findingsMissing = findingsRequired && findings.length === 0;
  const originalFindings = (review?.findings ?? []).map((finding) => ({
    element_id: finding.element_id,
    defect_id: finding.defect_id,
    related_element_id: finding.related_element_id,
  }));
  const dirty = result !== (review?.result ?? null)
    || feedback !== (review?.feedback ?? '')
    || JSON.stringify(findings) !== JSON.stringify(originalFindings);

  return {
    result,
    setResult: changeResult,
    feedback,
    setFeedback,
    findings,
    setFindings,
    findingsRequired,
    findingsMissing,
    taxonomy: taxonomyQuery.data,
    taxonomyIsLoading: taxonomyQuery.isLoading,
    sceneType: detail?.scene_profile?.scene_type ?? null,
    dirty,
    isSaving: createMutation.isPending || updateMutation.isPending,
    conflictMessage,
    dismissConflict,
    save,
    selectUnusableImage,
    canSave: result !== null && !findingsMissing && (result !== 'PASS' || findings.length === 0),
  };
}
