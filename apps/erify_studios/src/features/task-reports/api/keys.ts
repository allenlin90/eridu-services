import type {
  TaskReportScope,
} from '@eridu/api-types/task-management';

export const taskReportSourceKeys = {
  all: (studioId: string) => ['task-report-sources', studioId] as const,
  list: (studioId: string, filters: Partial<TaskReportScope>) =>
    [...taskReportSourceKeys.all(studioId), filters] as const,
};

export const taskReportDefinitionKeys = {
  all: (studioId: string) => ['task-report-definitions', studioId] as const,
  lists: (studioId: string) => [...taskReportDefinitionKeys.all(studioId), 'list'] as const,
  list: (studioId: string, params: { page?: number; limit?: number; search?: string }) =>
    [...taskReportDefinitionKeys.lists(studioId), params] as const,
  details: (studioId: string) => [...taskReportDefinitionKeys.all(studioId), 'detail'] as const,
  detail: (studioId: string, definitionId: string) =>
    [...taskReportDefinitionKeys.details(studioId), definitionId] as const,
};

export const taskReportResultKeys = {
  all: (studioId: string) => ['task-report-results', studioId] as const,
  forScope: (studioId: string, scopeHash: string) =>
    [...taskReportResultKeys.all(studioId), scopeHash] as const,
};
