import { useQuery } from '@tanstack/react-query';

import type { TaskReportScope } from '@eridu/api-types/task-management';
import { TASK_STATUS } from '@eridu/api-types/task-management';
import { DatePicker, Label } from '@eridu/ui';

import { MultiSelect } from '@/components/task-templates/shared/multi-select';
import { getStudioShows, studioShowsKeys } from '@/features/studio-shows/api/get-studio-shows';
import { apiClient } from '@/lib/api/client';

type ReportScopeFiltersProps = {
  studioId: string;
  scope: TaskReportScope | null;
  onChange: (scope: TaskReportScope | null) => void;
};

const SUBMITTED_STATUS_OPTIONS = [
  { label: 'Review', value: TASK_STATUS.REVIEW },
  { label: 'Completed', value: TASK_STATUS.COMPLETED },
  { label: 'Closed', value: TASK_STATUS.CLOSED },
];

export function ReportScopeFilters({
  studioId,
  scope,
  onChange,
}: ReportScopeFiltersProps) {
  const currentScope: TaskReportScope = scope || { submitted_statuses: [TASK_STATUS.REVIEW, TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED] };

  const updateScope = (updater: Partial<TaskReportScope>) => {
    const next = { ...currentScope, ...updater };
    for (const key in next) {
      if (Array.isArray(next[key as keyof TaskReportScope]) && Object.keys(next[key as keyof TaskReportScope] || {}).length === 0) {
        delete next[key as keyof TaskReportScope];
      }
      if (next[key as keyof TaskReportScope] === undefined) {
        delete next[key as keyof TaskReportScope];
      }
    }
    onChange(Object.keys(next).length > 0 ? next : null);
  };

  // 1. Shows
  const { data: showsData } = useQuery({
    queryKey: studioShowsKeys.list(studioId, { limit: 200 }),
    queryFn: () => getStudioShows(studioId, { limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });
  const showOptions = (showsData?.data || []).map((s) => ({ label: s.name, value: s.id }));

  // 2. Show Types
  const { data: showTypesData } = useQuery({
    queryKey: ['system-show-types'],
    queryFn: () => apiClient.get('/system/show-types', { params: { limit: 200 } }).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });
  const showTypeOptions = (showTypesData?.data || []).map((t: any) => ({ label: t.name, value: t.uid }));

  // 3. Source Templates (Task Templates)
  const { data: templatesData } = useQuery({
    queryKey: ['task-templates', studioId],
    queryFn: () => apiClient.get(`/studios/${studioId}/task-templates`, { params: { limit: 200 } }).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });
  const templateOptions = (templatesData?.data || []).map((t: any) => ({ label: t.name, value: t.uid }));

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label>Date From</Label>
        <DatePicker
          value={currentScope.date_from ?? ''}
          onChange={(val) => updateScope({ date_from: val || undefined })}
          className="w-full h-10"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Date To</Label>
        <DatePicker
          value={currentScope.date_to ?? ''}
          onChange={(val) => updateScope({ date_to: val || undefined })}
          className="w-full h-10"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Shows</Label>
        <MultiSelect
          options={showOptions}
          value={currentScope.show_ids || []}
          onChange={(val) => updateScope({ show_ids: val.length > 0 ? val : undefined })}
          placeholder="Filtering by all shows..."
        />
      </div>

      <div className="space-y-1.5">
        <Label>Show Types</Label>
        <MultiSelect
          options={showTypeOptions}
          value={currentScope.show_type_id ? [currentScope.show_type_id] : []}
          onChange={(val) => updateScope({ show_type_id: val.length > 0 ? val[0] : undefined })}
          placeholder="Any type"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Task Templates</Label>
        <MultiSelect
          options={templateOptions}
          value={currentScope.source_templates || []}
          onChange={(val) => updateScope({ source_templates: val.length > 0 ? val : undefined })}
          placeholder="Any template"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Task Statuses</Label>
        <MultiSelect
          options={SUBMITTED_STATUS_OPTIONS}
          value={currentScope.submitted_statuses || []}
          // @ts-expect-error Generic value mapping
          onChange={(val) => updateScope({ submitted_statuses: val.length > 0 ? val : undefined })}
          placeholder="Any status"
        />
      </div>

    </div>
  );
}
