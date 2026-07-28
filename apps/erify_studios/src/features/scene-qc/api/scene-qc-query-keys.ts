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
} as const;
