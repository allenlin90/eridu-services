import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

import type { TaskReportScope } from '@eridu/api-types/task-management';
import { TASK_STATUS } from '@eridu/api-types/task-management';
import { Button, DatePickerWithRange, Label } from '@eridu/ui';

import { getStudioClients } from '../api/get-studio-clients';

import { MultiSelect } from '@/components/task-templates/shared/multi-select';
import { getShowStandards } from '@/features/show-standards/api/get-show-standards';
import { getShowTypes } from '@/features/show-types/api/get-show-types';

type SelectOption = {
  label: string;
  value: string;
};

type ReportScopeFiltersProps = {
  studioId: string;
  scope: TaskReportScope | null;
  sourceTemplateOptions: SelectOption[];
  onChange: (scope: TaskReportScope | null) => void;
};

const SUBMITTED_STATUS_OPTIONS = [
  { label: 'Review', value: TASK_STATUS.REVIEW },
  { label: 'Completed', value: TASK_STATUS.COMPLETED },
  { label: 'Closed', value: TASK_STATUS.CLOSED },
];

const DEFAULT_SUBMITTED_STATUSES: TaskReportScope['submitted_statuses'] = [
  TASK_STATUS.REVIEW,
  TASK_STATUS.COMPLETED,
  TASK_STATUS.CLOSED,
];

function areStringArraysEqual(a: string[] = [], b: string[] = []): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function parseLocalDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  return new Date(`${value}T00:00:00`);
}

export function ReportScopeFilters({
  studioId,
  scope,
  sourceTemplateOptions,
  onChange,
}: ReportScopeFiltersProps) {
  const currentScope: TaskReportScope = scope || { submitted_statuses: [...DEFAULT_SUBMITTED_STATUSES] };

  const scopeDateRange = useMemo<DateRange | undefined>(() => {
    if (!currentScope.date_from && !currentScope.date_to) {
      return undefined;
    }

    return {
      from: parseLocalDate(currentScope.date_from),
      to: parseLocalDate(currentScope.date_to),
    };
  }, [currentScope.date_from, currentScope.date_to]);

  const updateScope = (updater: Partial<TaskReportScope>) => {
    const next: TaskReportScope = {
      ...currentScope,
      ...updater,
    };

    for (const key of Object.keys(next) as Array<keyof TaskReportScope>) {
      const value = next[key];
      if (value === undefined) {
        delete next[key];
        continue;
      }
      if (Array.isArray(value) && value.length === 0) {
        delete next[key];
      }
    }

    onChange(Object.keys(next).length > 0 ? next : null);
  };

  const { data: showTypesData } = useQuery({
    queryKey: ['show-types', 'list', studioId, 'report-scope'],
    queryFn: ({ signal }) => getShowTypes({ limit: 200 }, studioId, { signal }),
  });
  const showTypeOptions = (showTypesData?.data || []).map((item) => ({ label: item.name, value: item.id }));

  const { data: showStandardsData } = useQuery({
    queryKey: ['show-standards', 'list', studioId, 'report-scope'],
    queryFn: ({ signal }) => getShowStandards({ limit: 200 }, studioId, { signal }),
  });
  const showStandardOptions = (showStandardsData?.data || []).map((item) => ({ label: item.name, value: item.id }));

  const { data: clientsData } = useQuery({
    queryKey: ['studio-clients', studioId, 'report-scope'],
    queryFn: ({ signal }) => getStudioClients(studioId, { limit: 200 }, { signal }),
  });
  const clientOptions = (clientsData?.data || []).map((item) => ({ label: item.name, value: item.id }));
  const hasActiveFilters = Boolean(
    currentScope.date_from
    || currentScope.date_to
    || currentScope.client_id?.length
    || currentScope.show_standard_id?.length
    || currentScope.show_type_id?.length
    || currentScope.show_ids?.length
    || currentScope.source_templates?.length
    || !areStringArraysEqual(currentScope.submitted_statuses || [], DEFAULT_SUBMITTED_STATUSES as string[]),
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="md:col-span-2 lg:col-span-3 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ submitted_statuses: [...DEFAULT_SUBMITTED_STATUSES] })}
          disabled={!hasActiveFilters}
        >
          Reset all filters
        </Button>
      </div>

      <div className="space-y-1.5 lg:col-span-2">
        <Label>Date Range</Label>
        <DatePickerWithRange
          date={scopeDateRange}
          setDate={(range) => {
            const fromDate = range?.from ?? range?.to;
            const toDate = range?.to ?? range?.from;

            if (!fromDate && !toDate) {
              updateScope({
                date_from: undefined,
                date_to: undefined,
              });
              return;
            }

            updateScope({
              date_from: fromDate ? format(fromDate, 'yyyy-MM-dd') : undefined,
              date_to: toDate ? format(toDate, 'yyyy-MM-dd') : undefined,
            });
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Clients</Label>
        <MultiSelect
          options={clientOptions}
          value={currentScope.client_id || []}
          onChange={(values) => updateScope({ client_id: values.length > 0 ? values : undefined })}
          placeholder="Any client"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Show Standards</Label>
        <MultiSelect
          options={showStandardOptions}
          value={currentScope.show_standard_id || []}
          onChange={(values) => updateScope({ show_standard_id: values.length > 0 ? values : undefined })}
          placeholder="Any standard"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Show Types</Label>
        <MultiSelect
          options={showTypeOptions}
          value={currentScope.show_type_id || []}
          onChange={(values) => updateScope({ show_type_id: values.length > 0 ? values : undefined })}
          placeholder="Any type"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Source Templates</Label>
        <MultiSelect
          options={sourceTemplateOptions}
          value={currentScope.source_templates || []}
          onChange={(values) => updateScope({ source_templates: values.length > 0 ? values : undefined })}
          placeholder={sourceTemplateOptions.length > 0 ? 'Any template' : 'Set date range first'}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Task Statuses</Label>
        <MultiSelect
          options={SUBMITTED_STATUS_OPTIONS}
          value={currentScope.submitted_statuses || []}
          onChange={(values) => updateScope({ submitted_statuses: values.length > 0 ? values as TaskReportScope['submitted_statuses'] : undefined })}
          placeholder="Any status"
        />
      </div>
    </div>
  );
}
