import type { SceneQcResult } from '@eridu/api-types/scene-qc';

export type SceneQcResultChip = { label: string; className: string };

/**
 * Shared PASS/MINOR/FAIL chip styling for Records/Report surfaces -- text
 * label plus colour (§7.8), matching `scene-qc-queue-row.tsx`'s daily-review
 * chip palette so a result reads the same everywhere in the feature.
 */
export function resolveSceneQcResultChip(result: SceneQcResult): SceneQcResultChip {
  if (result === 'PASS') {
    return { label: 'Pass', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
  }
  if (result === 'MINOR') {
    return { label: 'Minor', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' };
  }
  return { label: 'Fail', className: 'bg-destructive/15 text-destructive' };
}
