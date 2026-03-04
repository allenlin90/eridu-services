import { memo, useMemo, useState } from 'react';

import { Button, Progress } from '@eridu/ui';

import { TaskFormRenderer } from '../shared/task-form-renderer';

import type { TemplateSchemaType } from './schema';

import { isFieldComplete } from '@/features/tasks/lib/progress';

type LivePreviewProps = {
  template: TemplateSchemaType;
};

type PreviewLoop = {
  id: string;
  name: string;
};

type PreviewLoopProgress = {
  completed: number;
  total: number;
};

function getPreviewLoops(template: TemplateSchemaType): PreviewLoop[] {
  const groups = Array.from(new Set(template.items.map((item) => item.group).filter((group): group is string => !!group)));
  if (groups.length === 0) {
    return [];
  }

  const metadataLoops = template.metadata?.loops;
  if (metadataLoops && metadataLoops.length > 0) {
    const normalized = metadataLoops
      .filter((loop) => groups.includes(loop.id))
      .map((loop) => ({
        id: loop.id,
        name: loop.name,
      }));

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return groups.map((group) => ({
    id: group,
    name: group,
  }));
}

export const LivePreview = memo(({ template }: LivePreviewProps) => {
  const loops = useMemo(() => getPreviewLoops(template), [template]);
  const loopProgressById = useMemo<Record<string, PreviewLoopProgress>>(() => {
    return template.items.reduce<Record<string, PreviewLoopProgress>>((acc, item) => {
      if (!item.group) {
        return acc;
      }

      if (!acc[item.group]) {
        acc[item.group] = { completed: 0, total: 0 };
      }

      const current = acc[item.group];
      current.total += 1;
      if (isFieldComplete(item.type, item.default_value)) {
        current.completed += 1;
      }

      return acc;
    }, {});
  }, [template.items]);
  const [selectedLoopId, setSelectedLoopId] = useState<string | undefined>(undefined);
  const activeLoopId = useMemo(() => {
    if (loops.length === 0) {
      return undefined;
    }
    return selectedLoopId && loops.some((loop) => loop.id === selectedLoopId)
      ? selectedLoopId
      : loops[0].id;
  }, [loops, selectedLoopId]);

  const activeLoopIndex = loops.findIndex((loop) => loop.id === activeLoopId);
  const activeLoop = activeLoopIndex >= 0 ? loops[activeLoopIndex] : undefined;
  const loopStepProgress = loops.length > 0 && activeLoopIndex >= 0
    ? ((activeLoopIndex + 1) / loops.length) * 100
    : 0;
  const canGoPrev = activeLoopIndex > 0;
  const canGoNext = activeLoopIndex >= 0 && activeLoopIndex < loops.length - 1;

  const previewTemplate = useMemo<TemplateSchemaType>(() => {
    if (!activeLoopId) {
      return template;
    }

    return {
      ...template,
      items: template.items.filter((item) => item.group === activeLoopId),
    };
  }, [template, activeLoopId]);

  return (
    <div className="space-y-4">
      {loops.length > 0 && (
        <div className="rounded-md border bg-background p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Loop Progress</span>
            <span>
              {activeLoopIndex + 1}
              /
              {loops.length}
              {' '}
              loops
            </span>
          </div>
          <Progress
            value={loopStepProgress}
            className="h-1.5"
          />
          <div className="mt-2 rounded-md border bg-muted/20 p-2">
            <p className="text-sm font-medium">
              {activeLoopIndex + 1}
              .
              {' '}
              {activeLoop?.name ?? '-'}
            </p>
            <p className="text-xs text-muted-foreground">
              Items completed:
              {' '}
              {(activeLoop ? loopProgressById[activeLoop.id]?.completed : 0) ?? 0}
              /
              {(activeLoop ? loopProgressById[activeLoop.id]?.total : 0) ?? 0}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={!canGoPrev}
              onClick={() => {
                if (!canGoPrev) {
                  return;
                }
                setSelectedLoopId(loops[activeLoopIndex - 1]?.id);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canGoNext}
              onClick={() => {
                if (!canGoNext) {
                  return;
                }
                setSelectedLoopId(loops[activeLoopIndex + 1]?.id);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      <TaskFormRenderer template={previewTemplate} />
    </div>
  );
});
LivePreview.displayName = 'LivePreview';
