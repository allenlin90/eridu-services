import { Button } from '@eridu/ui';

import * as m from '@/paraglide/messages';

type TaskReviewSelectionBarProps = {
  selectedTaskUids: string[];
  isApproving: boolean;
  onApprove: (taskUids: string[]) => void;
  onCancel: () => void;
};

/** Manager-only bulk approval affordance, kept outside the read-only QC surface. */
export function TaskReviewSelectionBar({ selectedTaskUids, isApproving, onApprove, onCancel }: TaskReviewSelectionBarProps) {
  if (selectedTaskUids.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center justify-between gap-4 rounded-full border border-muted bg-slate-900 px-6 py-3 text-slate-50 shadow-xl animate-in slide-in-from-bottom-5 dark:bg-slate-950">
      <div className="flex items-center gap-2 border-r border-slate-700 pr-4 dark:border-slate-800">
        <span className="text-sm font-medium">
          {selectedTaskUids.length === 1
            ? m.task_review_qc_selected_one()
            : m.task_review_qc_selected_many({ count: selectedTaskUids.length })}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          type="button"
          className="rounded-full bg-emerald-600 px-4 font-semibold text-white animate-in fade-in duration-200 hover:bg-emerald-700"
          onClick={() => onApprove(selectedTaskUids)}
          disabled={isApproving}
        >
          {isApproving ? m.task_review_qc_approving() : m.task_review_qc_approve_selected()}
        </Button>
        <Button size="sm" type="button" variant="ghost" className="rounded-full text-slate-400 hover:bg-slate-800 hover:text-white" onClick={onCancel}>{m.task_review_qc_cancel()}</Button>
      </div>
    </div>
  );
}
