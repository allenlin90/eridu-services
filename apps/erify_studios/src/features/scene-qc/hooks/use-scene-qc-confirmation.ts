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
 * `scene-qc-daily-workspace.tsx` from growing. See
 * SCENE_QC_CHILD_PR_4_BREAKDOWN.md section 3.5/§7.3.
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
    // The confirmation to open a report for -- only meaningful once a
    // confirmation exists (CURRENT or STALE); UNCONFIRMED has none.
    reportConfirmationId: summary?.confirmation_id ?? null,
  };
}
