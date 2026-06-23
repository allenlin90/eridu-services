import type { StudioShowDetail } from '@eridu/api-types/shows';

type ScheduleResumeNotice = {
  resumed_by: string;
  resumed_at: string;
  gate_task_uid: string;
};

function getScheduleResumeNotice(show: StudioShowDetail): ScheduleResumeNotice | null {
  const notice = show.metadata?.schedule_resume_notice;
  return notice && typeof notice === 'object' ? (notice as ScheduleResumeNotice) : null;
}

export function ScheduleResumeNoticeBanner({ show }: { show: StudioShowDetail }) {
  const notice = getScheduleResumeNotice(show);
  if (!notice) {
    return null;
  }

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      Manually resumed after a schedule removal on
      {' '}
      {new Date(notice.resumed_at).toLocaleString()}
      {' '}
      - this show will be removed again on the next republish unless the source schedule is updated.
    </div>
  );
}
