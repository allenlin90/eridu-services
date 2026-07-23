import { ScanLine } from 'lucide-react';
import { useState } from 'react';

import type { SceneReviewDetail as SceneReviewDetailDto } from '@eridu/api-types/task-management';
import { Button, Skeleton } from '@eridu/ui';

import { SceneReviewContext } from './scene-review-context';

import { TaskQcEvidenceViewer } from '@/features/tasks/components/task-qc-evidence-viewer';
import * as m from '@/paraglide/messages';

type SceneReviewDetailProps = {
  detail?: SceneReviewDetailDto;
  isLoading: boolean;
  isError: boolean;
};

export function SceneReviewDetail({ detail, isLoading, isError }: SceneReviewDetailProps) {
  const [showLayoutQc, setShowLayoutQc] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-[34rem] w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }
  if (isError) {
    return <div className="flex min-h-72 items-center justify-center p-6 text-sm text-destructive">{m.scene_review_detail_error()}</div>;
  }
  if (!detail) {
    return <div className="flex min-h-72 items-center justify-center p-6 text-center text-sm text-muted-foreground">{m.scene_review_select_prompt()}</div>;
  }

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">{detail.show.name}</h2>
          <p className="text-xs text-muted-foreground">{detail.task_type}</p>
        </div>
        <Button
          type="button"
          variant={showLayoutQc ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowLayoutQc((current) => !current)}
          aria-pressed={showLayoutQc}
        >
          <ScanLine className="mr-2 h-4 w-4" />
          {m.task_review_qc_layout_mode()}
        </Button>
      </div>
      <TaskQcEvidenceViewer evidence={detail.evidence} showLayoutQc={showLayoutQc} />
      <SceneReviewContext detail={detail} />
    </div>
  );
}
