import { FileText } from 'lucide-react';

import type { SceneQcRecordDetail } from '@eridu/api-types/scene-qc';
import { Badge, Button, Skeleton } from '@eridu/ui';

import { resolveSceneQcResultChip } from '../lib/scene-qc-result-chip';

import { SceneQcExpectedReferencePanel } from './scene-qc-expected-reference-panel';
import { SceneQcImageFrame } from './scene-qc-image-frame';

const REPORT_STATUS_CHIP: Record<'CURRENT' | 'STALE' | 'SUPERSEDED', { label: string; className: string }> = {
  CURRENT: { label: 'Current', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  STALE: { label: 'Stale', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  SUPERSEDED: { label: 'Superseded', className: 'bg-muted text-muted-foreground' },
};

type SceneQcRecordDetailContentProps = {
  detail: SceneQcRecordDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  onOpenReport: (confirmationId: string) => void;
};

/** Shared detail body used by both the desktop Sheet and mobile Drawer (§7.5). */
export function SceneQcRecordDetailContent({ detail, isLoading, isError, onOpenReport }: SceneQcRecordDetailContentProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (isError) {
    return <div className="p-6 text-center text-sm text-destructive">Unable to load this record.</div>;
  }
  if (!detail) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Select a record to view its details.</div>;
  }

  const resultChip = resolveSceneQcResultChip(detail.review.result);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{detail.show.name}</h3>
          <Badge variant="outline" className={resultChip.className}>{resultChip.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(detail.show.scheduled_start_time).toLocaleString()}
          {detail.show.client ? ` · ${detail.show.client.name}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">
          {detail.show.platforms.map((platform) => platform.name).join(', ') || 'No platform'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Pinned evidence</p>
          {detail.review.evidence.length > 0
            ? detail.review.evidence.map((item) => (
                <SceneQcImageFrame key={item.file_url} src={item.file_url} alt={item.label} />
              ))
            : <div className="flex min-h-[10rem] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">No evidence</div>}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Expected reference</p>
          <SceneQcExpectedReferencePanel sceneProfile={detail.review.expected_reference} />
        </div>
      </div>

      {detail.review.feedback
        ? (
            <div className="rounded-md border p-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground">Feedback</p>
              <p>{detail.review.feedback}</p>
            </div>
          )
        : null}

      <div className="rounded-md border p-3 text-sm">
        <p className="text-xs font-medium text-muted-foreground">Confirmation</p>
        {detail.confirmation
          ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={REPORT_STATUS_CHIP[detail.confirmation.status].className}>
                  {REPORT_STATUS_CHIP[detail.confirmation.status].label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Revision
                  {' '}
                  {detail.confirmation.revision}
                  {' '}
                  by
                  {' '}
                  {detail.confirmation.confirmed_by.name}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenReport(detail.confirmation!.id)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View report
                </Button>
              </div>
            )
          : <p className="mt-1 text-xs text-muted-foreground">Not yet confirmed</p>}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Audit history</p>
        {detail.audit_history.length === 0
          ? <p className="text-xs text-muted-foreground">No changes recorded.</p>
          : (
              <ul className="space-y-1.5 text-xs">
                {detail.audit_history.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2 border-b pb-1.5 last:border-b-0">
                    <span>
                      {entry.actor?.name ?? 'System'}
                      {' '}
                      {entry.action === 'CREATE' ? 'created' : 'updated'}
                      {' '}
                      {entry.new_result ? `→ ${entry.new_result}` : ''}
                    </span>
                    <span className="text-muted-foreground">{new Date(entry.at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
      </div>
    </div>
  );
}
