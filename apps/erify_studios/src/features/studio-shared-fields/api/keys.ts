export const studioSharedFieldsKeys = {
  all: (studioId: string) => ['studio-shared-fields', studioId] as const,
  detail: (studioId: string) => [...studioSharedFieldsKeys.all(studioId), 'settings'] as const,
};
