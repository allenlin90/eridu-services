import type { SceneQcDailySummary } from '@eridu/api-types/scene-qc';
import { Skeleton } from '@eridu/ui';

import type { useSceneQcConfirmation } from '../hooks/use-scene-qc-confirmation';

import { SceneQcConfirmationCard } from './scene-qc-confirmation-card';

type SceneQcSummaryCardsProps = {
  summary: SceneQcDailySummary | undefined;
  isLoading: boolean;
  confirmation: ReturnType<typeof useSceneQcConfirmation>;
  onOpenReport: (confirmationId: string) => void;
};

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

/** §7.2 (3): completion summary with total, reviewed, remaining, blockers, and confirmation state. */
export function SceneQcSummaryCards({ summary, isLoading, confirmation, onOpenReport }: SceneQcSummaryCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <StatCard label="Total" value={summary.eligible_count} />
      <StatCard label="Reviewed" value={summary.reviewed_count} />
      <StatCard label="Remaining" value={summary.remaining_count} />
      <StatCard label="Blocked" value={summary.blocked_no_evidence_count} />
      <SceneQcConfirmationCard summary={summary} isLoading={isLoading} confirmation={confirmation} onOpenReport={onOpenReport} />
    </div>
  );
}
