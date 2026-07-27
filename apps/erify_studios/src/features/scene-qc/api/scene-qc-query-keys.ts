export const sceneQcKeys = {
  all: ['scene-qc'] as const,
  profilePrefix: (studioId: string) => [...sceneQcKeys.all, 'profile', studioId] as const,
  profile: (studioId: string, clientId: string | undefined) =>
    [...sceneQcKeys.profilePrefix(studioId), clientId] as const,
} as const;
