import type { StudioShow } from '../api/get-studio-shows';

export type ShowActualsStatus = 'complete' | 'incomplete' | 'missing';

export function getShowActualsStatus(show: Pick<StudioShow, 'actual_start_time' | 'actual_end_time'>): ShowActualsStatus {
  if (show.actual_start_time && show.actual_end_time) {
    return 'complete';
  }

  if (show.actual_start_time || show.actual_end_time) {
    return 'incomplete';
  }

  return 'missing';
}

export function toShowActualsServerFilter(status: ShowActualsStatus): 'complete' | 'missing' {
  return status === 'complete' ? 'complete' : 'missing';
}
