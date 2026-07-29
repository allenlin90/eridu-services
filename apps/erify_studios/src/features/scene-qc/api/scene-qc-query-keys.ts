export const sceneQcKeys = {
  all: ['scene-qc'] as const,
  profilePrefix: (studioId: string) => [...sceneQcKeys.all, 'profile', studioId] as const,
  profile: (studioId: string, clientId: string | undefined) =>
    [...sceneQcKeys.profilePrefix(studioId), clientId] as const,
  dailyPrefix: (studioId: string) => [...sceneQcKeys.all, 'daily', studioId] as const,
  summary: (studioId: string, date: string) => [...sceneQcKeys.dailyPrefix(studioId), 'summary', date] as const,
  itemsPrefix: (studioId: string, date: string) => [...sceneQcKeys.dailyPrefix(studioId), 'items', date] as const,
  items: (studioId: string, date: string, filters: unknown) =>
    [...sceneQcKeys.itemsPrefix(studioId, date), filters] as const,
  itemDetail: (studioId: string, date: string, showId: string | undefined) =>
    [...sceneQcKeys.dailyPrefix(studioId), 'item', date, showId] as const,
  recordsPrefix: (studioId: string) => [...sceneQcKeys.all, 'records', studioId] as const,
  records: (studioId: string, filters: unknown) => [...sceneQcKeys.recordsPrefix(studioId), filters] as const,
  recordDetail: (studioId: string, reviewId: string | undefined) =>
    [...sceneQcKeys.recordsPrefix(studioId), 'detail', reviewId] as const,
  reportPrefix: (studioId: string) => [...sceneQcKeys.all, 'report', studioId] as const,
  report: (studioId: string, confirmationId: string | undefined) =>
    [...sceneQcKeys.reportPrefix(studioId), confirmationId] as const,
} as const;
