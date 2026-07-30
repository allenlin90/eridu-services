import { FileText } from 'lucide-react';

import type { SceneQcRecordDetail } from '@eridu/api-types/scene-qc';
import { Badge, Button, Skeleton } from '@eridu/ui';

import { resolveSceneQcResultChip } from '../lib/scene-qc-result-chip';

import { SceneQcExpectedReferencePanel } from './scene-qc-expected-reference-panel';
import { SceneQcImageFrame } from './scene-qc-image-frame';
import { SceneQcRecordHistory } from './scene-qc-record-history';

const REPORT_STATUS_CHIP: Record<'CURRENT' | 'STALE' | 'SUPERSEDED', { label: string; className: string }> = {
  CURRENT: { label: 'Current', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  STALE: { label: 'Stale', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  SUPERSEDED: { label: 'Superseded', className: 'bg-muted text-muted-foreground' },
};

type SceneQcRecordDetailContentProps = {
  studioId: string;
  detail: SceneQcRecordDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  onOpenReport: (confirmationId: string) => void;
};

/** Shared detail body used by both the desktop Sheet and mobile Drawer (§7.5). */
export function SceneQcRecordDetailContent({ studioId, detail, isLoading, isError, onOpenReport }: SceneQcRecordDetailContentProps) {
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

  const resultChip = resolveSceneQcResultChip(detail.effective_result);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{detail.show.name}</h3>
          <Badge variant="outline" className={resultChip.className}>{resultChip.label}</Badge>
          {detail.effective_result !== detail.review.result
            ? (
                <span className="text-xs text-muted-foreground">
                  Originally
                  {' '}
                  {detail.review.result}
                </span>
              )
            : null}
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
              <p className="text-xs font-medium text-muted-foreground">Optional note</p>
              <p>{detail.review.feedback}</p>
            </div>
          )
        : null}

      {detail.effective_findings.length > 0
        ? (
            <div className="rounded-md border p-3 text-sm">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Effective issues</p>
              <ul className="space-y-1">
                {detail.effective_findings.map((finding) => (
                  <li key={`${finding.element_key}:${finding.defect_key}:${finding.related_element_key ?? ''}`}>
                    {finding.element_label}
                    {' · '}
                    {finding.defect_label}
                    {finding.related_element_label ? ` · ${finding.related_element_label}` : ''}
                  </li>
                ))}
              </ul>
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

      <SceneQcRecordHistory studioId={studioId} detail={detail} />
    </div>
  );
}
