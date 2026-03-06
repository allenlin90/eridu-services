export function sortShiftBlocksByStart<T extends { start_time: string }>(blocks: T[]): T[] {
  return [...blocks].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}

export function sortShiftFormBlocksByStart<T extends { startTime: string }>(blocks: T[]): T[] {
  return [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
}
