import { useCallback } from 'react';

import type { SceneQcDailySummary } from '@eridu/api-types/scene-qc';

import { useConfirmSceneQcDay } from '../api/confirm-scene-qc-day';

type UseSceneQcConfirmationParams = {
  studioId: string;
  operationalDate: string;
  summary: SceneQcDailySummary | undefined;
};

/**
 * Owns the confirm/reconfirm mutation, its pending/error state, whether the
 * day is confirmable, and the "open current report" target. Keeps
 * `scene-qc-daily-workspace.tsx` from growing. See "Confirmation states" in
 * apps/erify_studios/docs/SCENE_QC.md.
 */
export function useSceneQcConfirmation({ studioId, operationalDate, summary }: UseSceneQcConfirmationParams) {
  const mutation = useConfirmSceneQcDay(studioId);

  const dayComplete = Boolean(summary && summary.remaining_count === 0 && summary.blocked_no_evidence_count === 0);
  const canConfirm = summary?.confirmation === 'UNCONFIRMED' && dayComplete;
  const canReconfirm = summary?.confirmation === 'STALE' && dayComplete;

  const confirm = useCallback(() => {
    return mutation.mutateAsync({ operational_date: operationalDate });
  }, [mutation, operationalDate]);

  return {
    confirm,
    isPending: mutation.isPending,
    error: mutation.error,
    dayComplete,
    canConfirm,
    canReconfirm,
    // The confirmation to open a report for -- only meaningful when
    // CURRENT. STALE has a `confirmation_id` too, but the card never opens
    // it from here (that revision's report is disabled on this card and
    // only reachable from Records); UNCONFIRMED has none.
    reportConfirmationId: summary?.confirmation_id ?? null,
  };
}
