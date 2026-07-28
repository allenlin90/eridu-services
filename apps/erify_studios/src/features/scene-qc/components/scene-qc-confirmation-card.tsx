import { AlertTriangle, CheckCircle2, FileText, ShieldCheck } from 'lucide-react';

import type { SceneQcDailySummary } from '@eridu/api-types/scene-qc';
import { Badge, Button, Skeleton } from '@eridu/ui';

import type { useSceneQcConfirmation } from '../hooks/use-scene-qc-confirmation';

export const SCENE_QC_CONFIRMATION_ACTION_ID = 'scene-qc-confirmation-action';

type SceneQcConfirmationCardProps = {
  summary: SceneQcDailySummary | undefined;
  isLoading: boolean;
  confirmation: ReturnType<typeof useSceneQcConfirmation>;
  onOpenReport: (confirmationId: string) => void;
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * §7.3 rows 6-8: the four confirmation states, pure function of the summary
 * response. All four states carry text labels in addition to colour (§7.8).
 * See SCENE_QC_CHILD_PR_4_BREAKDOWN.md section 3.3.
 */
export function SceneQcConfirmationCard({ summary, isLoading, confirmation, onOpenReport }: SceneQcConfirmationCardProps) {
  if (isLoading || !summary) {
    return (
      <div className="rounded-lg border p-3">
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  const pendingAnnouncement = confirmation.isPending ? 'Confirming operational day…' : '';

  if (summary.confirmation === 'CURRENT') {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-700">Confirmed</Badge>
          <span className="text-xs text-muted-foreground">
            Revision
            {summary.confirmation_revision}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Confirmed by
          {' '}
          {summary.confirmed_by?.name}
          {' '}
          on
          {' '}
          {summary.confirmed_at ? formatDateTime(summary.confirmed_at) : '—'}
        </p>
        <Button
          type="button"
          id={SCENE_QC_CONFIRMATION_ACTION_ID}
          size="sm"
          variant="outline"
          className="w-fit"
          onClick={() => summary.confirmation_id && onOpenReport(summary.confirmation_id)}
        >
          <FileText className="mr-2 h-4 w-4" />
          Open current report
        </Button>
      </div>
    );
  }

  if (summary.confirmation === 'STALE') {
    const parts: string[] = [];
    if (summary.confirmation_added_show_count)
      parts.push(`${summary.confirmation_added_show_count} added`);
    if (summary.confirmation_removed_show_count)
      parts.push(`${summary.confirmation_removed_show_count} removed`);
    if (summary.confirmation_changed_review_count)
      parts.push(`${summary.confirmation_changed_review_count} changed`);

    return (
      <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
          <Badge variant="outline" className="border-amber-500/50 text-amber-700">Stale confirmation</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          The confirmed scope has changed since revision
          {' '}
          {summary.confirmation_revision}
          {parts.length > 0 ? `: ${parts.join(', ')}.` : '.'}
        </p>
        <p className="text-xs text-muted-foreground">
          The revision
          {' '}
          {summary.confirmation_revision}
          {' '}
          report remains available and attributable from Records.
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            id={SCENE_QC_CONFIRMATION_ACTION_ID}
            size="sm"
            disabled={!confirmation.canReconfirm || confirmation.isPending}
            onClick={() => void confirmation.confirm()}
          >
            {confirmation.isPending ? 'Reconfirming…' : 'Reconfirm'}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled title="Only the current revision's report can be opened here">
            <FileText className="mr-2 h-4 w-4" />
            Open current report
          </Button>
        </div>
        <div aria-live="polite" className="sr-only">{pendingAnnouncement}</div>
      </div>
    );
  }

  // UNCONFIRMED
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">Confirmation</p>
      <Button
        type="button"
        id={SCENE_QC_CONFIRMATION_ACTION_ID}
        size="sm"
        disabled={!confirmation.canConfirm || confirmation.isPending}
        onClick={() => void confirmation.confirm()}
      >
        <CheckCircle2 className="mr-2 h-4 w-4" />
        {confirmation.isPending ? 'Confirming…' : 'Confirm day'}
      </Button>
      {!confirmation.dayComplete
        ? (
            <p className="text-xs text-muted-foreground">
              {summary.remaining_count > 0 && `${summary.remaining_count} Show(s) still need review. `}
              {summary.blocked_no_evidence_count > 0 && `${summary.blocked_no_evidence_count} Show(s) are blocked with no evidence.`}
            </p>
          )
        : null}
      <div aria-live="polite" className="sr-only">{pendingAnnouncement}</div>
    </div>
  );
}
