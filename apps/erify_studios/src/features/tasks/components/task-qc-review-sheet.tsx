import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useState } from 'react';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { Badge, Button, Collapsible, CollapsibleContent, CollapsibleTrigger } from '@eridu/ui';

import { ResponsiveSheet } from '@/components/responsive-sheet';
import { getStudioTask, studioTaskKeys } from '@/features/tasks/api/get-studio-task';
import { TaskQcEvidenceViewer } from '@/features/tasks/components/task-qc-evidence-viewer';
import { getTaskQcEvidence, getTaskQcMetrics } from '@/features/tasks/lib/task-qc-evidence';
import * as m from '@/paraglide/messages';

type TaskQcReviewSheetProps = {
  studioId: string;
  task: TaskWithRelationsDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Read-only review surface; future review tools can be added beside the evidence section. */
export function TaskQcReviewSheet({ studioId, task, open, onOpenChange }: TaskQcReviewSheetProps) {
  const [showLayoutQc, setShowLayoutQc] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const taskId = task?.id;
  const taskQuery = useQuery({
    queryKey: taskId ? studioTaskKeys.detail(studioId, taskId) : studioTaskKeys.all,
    queryFn: ({ signal }) => getStudioTask(studioId, taskId!, { signal }),
    enabled: open && Boolean(taskId),
  });
  const resolvedTask = taskQuery.data ?? task;
  const evidence = resolvedTask
    ? getTaskQcEvidence(resolvedTask).map((item, index) => item.key.startsWith('image-')
        ? { ...item, label: m.task_review_qc_screenshot_number({ number: index + 1 }) }
        : item)
    : [];
  const metrics = resolvedTask ? getTaskQcMetrics(resolvedTask) : [];
  const show = resolvedTask?.show;

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={resolvedTask?.description ?? m.task_review_qc_sheet_title()}
      description={m.task_review_qc_sheet_description()}
      contentClassName="sm:max-w-5xl"
      mobileBodyClassName="pb-4"
    >
      <div className="space-y-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary">{m.task_review_qc_read_only()}</Badge>
          <div className="inline-flex rounded-md border p-1">
            <Button type="button" size="sm" variant={showLayoutQc ? 'ghost' : 'secondary'} onClick={() => setShowLayoutQc(false)}>{m.task_review_qc_final_screenshot()}</Button>
            <Button type="button" size="sm" variant={showLayoutQc ? 'secondary' : 'ghost'} onClick={() => setShowLayoutQc(true)}>{m.task_review_qc_layout_mode()}</Button>
          </div>
        </div>

        {taskQuery.isLoading
          ? (
              <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            )
          : taskQuery.isError
            ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
                  <p className="font-medium">{m.task_review_qc_load_error()}</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => taskQuery.refetch()}>{m.task_review_qc_try_again()}</Button>
                </div>
              )
            : <TaskQcEvidenceViewer key={resolvedTask?.id} evidence={evidence} showLayoutQc={showLayoutQc} />}

        <Collapsible open={showDetails} onOpenChange={setShowDetails} className="rounded-lg border">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="w-full justify-between rounded-lg px-4">
              {m.task_review_qc_show_details()}
              <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t px-4 py-4">
            <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Detail label={m.task_review_qc_detail_show()} value={show?.name} />
              <Detail label={m.task_review_qc_detail_show_date()} value={show?.start_time ? format(new Date(show.start_time), 'PPp') : undefined} />
              <Detail label={m.task_review_qc_detail_client()} value={show?.client_name ?? undefined} />
              <Detail label={m.task_review_qc_detail_platform()} value={show?.platforms.map((platform) => platform.label).join(', ')} />
              {metrics.map((metric) => <Detail key={metric.key} label={getMetricLabel(metric.key)} value={metric.value} />)}
            </dl>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ResponsiveSheet>
  );
}

function getMetricLabel(key: 'gmv' | 'viewers' | 'ctr' | 'cto'): string {
  const labels = {
    gmv: m.task_review_qc_metric_gmv,
    viewers: m.task_review_qc_metric_viewers,
    ctr: m.task_review_qc_metric_ctr,
    cto: m.task_review_qc_metric_cto,
  };
  return labels[key]();
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate font-medium" title={value}>{value || '—'}</dd>
    </div>
  );
}
