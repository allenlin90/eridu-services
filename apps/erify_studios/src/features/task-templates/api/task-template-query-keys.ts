type TaskTemplateListFilters = {
  search?: string;
};

type TaskTemplatePickerFilters = {
  search?: string;
  pageSize: number;
};

export const taskTemplateQueryKeys = {
  all: ['task-templates'] as const,
  listPrefix: (studioId: string) =>
    [...taskTemplateQueryKeys.all, 'list', studioId] as const,
  list: (studioId: string, filters: TaskTemplateListFilters) =>
    [...taskTemplateQueryKeys.listPrefix(studioId), filters] as const,
  allPickerPrefix: (studioId: string) =>
    [...taskTemplateQueryKeys.listPrefix(studioId), 'all-picker'] as const,
  allPicker: (studioId: string, filters: TaskTemplatePickerFilters) =>
    [...taskTemplateQueryKeys.allPickerPrefix(studioId), filters] as const,
  detailPrefix: (studioId: string) =>
    [...taskTemplateQueryKeys.all, 'detail', studioId] as const,
  detail: (studioId: string, templateId: string) =>
    [...taskTemplateQueryKeys.detailPrefix(studioId), templateId] as const,
} as const;
