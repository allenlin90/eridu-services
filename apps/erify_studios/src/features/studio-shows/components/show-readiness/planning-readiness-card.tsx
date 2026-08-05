import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react';

import { Badge } from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import { useShowPlanningReadiness } from '@/features/studio-shows/api/get-show-planning-readiness';

function ConditionIcon({ status }: { status: string }) {
  if (status === 'met') {
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  }
  if (status === 'not_applicable') {
    return <CircleDashed className="h-4 w-4 text-muted-foreground" />;
  }
  return <XCircle className="h-4 w-4 text-amber-600" />;
}

/**
 * Phase 5 item 11 — server-computed planning-readiness checklist for a
 * single show (room, creators, platforms, task stages, task assignment).
 * Advisory only: nothing here blocks a status change.
 */
export function PlanningReadinessCard({ studioId, showId }: { studioId: string; showId: string }) {
  const { data, isLoading } = useShowPlanningReadiness(studioId, showId);

  if (isLoading || !data) {
    return null;
  }

  return (
    <div className="rounded-md border bg-background p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Planning Readiness</h2>
        <Badge
          variant="outline"
          className={cn(
            'font-medium',
            data.is_ready ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700',
          )}
        >
          {data.met_count}
          {' / '}
          {data.total_count}
          {' ready'}
        </Badge>
      </div>
      <ul className="space-y-1.5">
        {data.conditions.map((condition) => (
          <li key={condition.key} className="flex items-center gap-2 text-sm">
            <ConditionIcon status={condition.status} />
            <span className={condition.status === 'met' ? 'text-foreground' : 'text-muted-foreground'}>
              {condition.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
