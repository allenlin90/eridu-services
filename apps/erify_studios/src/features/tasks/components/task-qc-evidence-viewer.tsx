import { ChevronLeft, ChevronRight, ExternalLink, ImageOff } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import type { TaskQcEvidence } from '@/features/tasks/lib/task-qc-evidence';
import * as m from '@/paraglide/messages';

type TaskQcEvidenceViewerProps = {
  evidence: TaskQcEvidence[];
  showLayoutQc: boolean;
};

/** Presents submitted screenshots as the primary QC artifact with phone-friendly navigation. */
export function TaskQcEvidenceViewer({ evidence, showLayoutQc }: TaskQcEvidenceViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const activeEvidence = evidence[activeIndex];

  if (!activeEvidence) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 text-center">
        <ImageOff className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="font-medium">{m.task_review_qc_no_screenshot()}</p>
          <p className="text-sm text-muted-foreground">{m.task_review_qc_no_screenshot_description()}</p>
        </div>
      </div>
    );
  }

  const goTo = (index: number) => {
    setActiveIndex((index + evidence.length) % evidence.length);
  };
  const hasFailed = failedUrls.has(activeEvidence.url);

  return (
    <div className="space-y-3">
      <div className="relative flex min-h-[22rem] items-center justify-center overflow-hidden rounded-lg border bg-slate-950 lg:min-h-[36rem]">
        {hasFailed
          ? (
              <div className="flex flex-col items-center gap-3 px-6 text-center text-slate-300">
                <ImageOff className="h-9 w-9" />
                <p className="text-sm">{m.task_review_qc_preview_error()}</p>
                <Button variant="secondary" size="sm" asChild>
                  <a href={activeEvidence.url} target="_blank" rel="noreferrer">
                    {m.task_review_qc_open_original()}
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            )
          : (
              <div className="relative flex max-h-[70vh] max-w-full items-center justify-center">
                <img
                  src={activeEvidence.url}
                  alt={activeEvidence.label}
                  className="max-h-[70vh] max-w-full object-contain"
                  onError={() => setFailedUrls((current) => new Set(current).add(activeEvidence.url))}
                />
                {showLayoutQc
                  ? (
                      <div className="pointer-events-none absolute inset-0" aria-label={m.task_review_qc_overlay_label()}>
                        <div className="absolute inset-[5%] rounded border-2 border-dashed border-cyan-400/90">
                          <span className="absolute left-2 top-2 rounded bg-cyan-950/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-100">{m.task_review_qc_safe_area()}</span>
                        </div>
                        <div className="absolute left-[22%] top-[12%] h-[55%] w-[38%] rounded border-2 border-fuchsia-400/90">
                          <span className="absolute left-1 top-1 rounded bg-fuchsia-950/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-100">{m.task_review_qc_host_focus()}</span>
                        </div>
                        <div className="absolute bottom-[8%] right-[6%] h-[34%] w-[32%] rounded border-2 border-amber-300/90">
                          <span className="absolute bottom-1 right-1 rounded bg-amber-950/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100">{m.task_review_qc_product_zone()}</span>
                        </div>
                      </div>
                    )
                  : null}
              </div>
            )}

        {evidence.length > 1
          ? (
              <>
                <Button type="button" variant="secondary" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full" onClick={() => goTo(activeIndex - 1)} aria-label={m.task_review_qc_previous()}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button type="button" variant="secondary" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full" onClick={() => goTo(activeIndex + 1)} aria-label={m.task_review_qc_next()}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )
          : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium">{activeEvidence.label}</p>
        <span className="shrink-0 text-xs text-muted-foreground">{m.task_review_qc_position({ current: activeIndex + 1, total: evidence.length })}</span>
      </div>
      {evidence.length > 1
        ? (
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label={m.task_review_qc_gallery_label()}>
              {evidence.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  className={cn('h-16 w-12 shrink-0 overflow-hidden rounded border-2 bg-muted', index === activeIndex ? 'border-primary' : 'border-transparent')}
                  onClick={() => setActiveIndex(index)}
                  aria-label={m.task_review_qc_view_screenshot({ label: item.label })}
                >
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )
        : null}
    </div>
  );
}
