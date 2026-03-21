import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { TaskReportScope, TaskReportSelectedColumn } from '@eridu/api-types/task-management';

import { ReportBuilder } from '../report-builder';

const mockPreflightMutateAsync = vi.fn();
const mockRunMutateAsync = vi.fn();

vi.mock('../../hooks/use-task-report-mutations', () => ({
  useTaskReportMutations: vi.fn(() => ({
    preflightMutation: {
      mutateAsync: mockPreflightMutateAsync,
      isPending: false,
    },
    runMutation: {
      mutateAsync: mockRunMutateAsync,
      isPending: false,
    },
  })),
}));

vi.mock('../../hooks/use-task-report-sources', () => ({
  useTaskReportSources: vi.fn(() => ({
    data: {
      shared_fields: [
        { key: 'gmv', label: 'GMV', type: 'number', category: 'metric', is_active: true },
      ],
      sources: [
        {
          template_id: 'ttpl_00000000000000000001',
          template_name: 'Template A',
          task_type: 'CLOSURE',
          submitted_task_count: 3,
          fields: [
            {
              key: 'gmv',
              field_key: 'gmv',
              label: 'GMV',
              type: 'number',
              standard: true,
              source_template_id: 'ttpl_00000000000000000001',
              source_template_name: 'Template A',
            },
          ],
        },
      ],
    },
    isLoading: false,
    isError: false,
  })),
}));

vi.mock('../report-scope-filters', () => ({
  ReportScopeFilters: () => <div data-testid="report-scope-filters">Scope Filters</div>,
}));

vi.mock('../report-column-picker', () => ({
  ReportColumnPicker: () => <div data-testid="report-column-picker">Column Picker</div>,
}));

function ReportBuilderHarness({
  initialScope,
  initialColumns,
  definitionId,
  initialDefinitionDescription,
  onSaveDefinition,
}: {
  initialScope: TaskReportScope | null;
  initialColumns: TaskReportSelectedColumn[];
  definitionId?: string | null;
  initialDefinitionDescription?: string | null;
  onSaveDefinition?: (input: {
    name: string;
    description?: string | null;
    scope: TaskReportScope;
    columns: TaskReportSelectedColumn[];
  }) => Promise<void>;
}) {
  const [scope, setScope] = useState<TaskReportScope | null>(initialScope);
  const [columns, setColumns] = useState<TaskReportSelectedColumn[]>(initialColumns);

  return (
    <ReportBuilder
      studioId="std_00000000000000000001"
      draftScope={scope}
      setDraftScope={setScope}
      draftColumns={columns}
      setDraftColumns={setColumns}
      definitionId={definitionId}
      initialDefinitionDescription={initialDefinitionDescription}
      onSaveDefinition={onSaveDefinition}
    />
  );
}

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  );
}

describe('reportBuilder', () => {
  it('keeps run disabled when mandatory date range is missing', () => {
    renderWithQueryClient(
      <ReportBuilderHarness
        initialScope={null}
        initialColumns={[{ key: 'gmv', label: 'GMV', type: 'number' }]}
      />,
    );

    expect(screen.getByRole('button', { name: /Preflight/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Run Report/i })).toBeDisabled();
  });

  it('blocks preflight/run when incompatible columns exist and unblocks after removal', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <ReportBuilderHarness
        initialScope={{ date_from: '2026-03-01', date_to: '2026-03-07', submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'] }}
        initialColumns={[{ key: 'missing_column', label: 'Missing Column', type: 'text' }]}
      />,
    );

    expect(screen.getByText('Definition Conflict Detected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Preflight/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Run Report/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Remove: Missing Column/i }));
    expect(screen.queryByText('Definition Conflict Detected')).not.toBeInTheDocument();

    const runButton = screen.getByRole('button', { name: /Run Report/i });
    expect(runButton).toBeDisabled();
  });

  it('runs preflight when scope has required dates and selected columns are compatible', async () => {
    const user = userEvent.setup();
    mockPreflightMutateAsync.mockResolvedValueOnce({
      show_count: 5,
      task_count: 10,
      within_limit: true,
      limit: 10000,
    });

    renderWithQueryClient(
      <ReportBuilderHarness
        initialScope={{ date_from: '2026-03-01', date_to: '2026-03-07', submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'] }}
        initialColumns={[{ key: 'gmv', label: 'GMV', type: 'number' }]}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Preflight/i }));
    expect(mockPreflightMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockRunMutateAsync).not.toHaveBeenCalled();
  });

  it('saves report definition when definition metadata and scope are valid', async () => {
    const user = userEvent.setup();
    const onSaveDefinition = vi.fn().mockResolvedValue(undefined);

    renderWithQueryClient(
      <ReportBuilderHarness
        initialScope={{ date_from: '2026-03-01', date_to: '2026-03-07', submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'] }}
        initialColumns={[{ key: 'gmv', label: 'GMV', type: 'number' }]}
        onSaveDefinition={onSaveDefinition}
      />,
    );

    await user.type(
      screen.getByLabelText('Definition Name'),
      'Weekly moderation report',
    );
    await user.type(
      screen.getByLabelText('Description (optional)'),
      'Used for weekly moderation KPI checks',
    );
    await user.click(screen.getByRole('button', { name: /Save as Definition/i }));

    expect(onSaveDefinition).toHaveBeenCalledWith({
      name: 'Weekly moderation report',
      description: 'Used for weekly moderation KPI checks',
      scope: {
        date_from: '2026-03-01',
        date_to: '2026-03-07',
        submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
      },
      columns: [{ key: 'gmv', label: 'GMV', type: 'number' }],
    });
  });

  it('sends null description when editing and the description is cleared', async () => {
    const user = userEvent.setup();
    const onSaveDefinition = vi.fn().mockResolvedValue(undefined);

    renderWithQueryClient(
      <ReportBuilderHarness
        definitionId="trd_00000000000000000001"
        initialDefinitionDescription="Existing description"
        initialScope={{ date_from: '2026-03-01', date_to: '2026-03-07', submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'] }}
        initialColumns={[{ key: 'gmv', label: 'GMV', type: 'number' }]}
        onSaveDefinition={onSaveDefinition}
      />,
    );

    await user.type(screen.getByLabelText('Definition Name'), 'Weekly moderation report');
    await user.clear(screen.getByLabelText('Description (optional)'));
    await user.click(screen.getByRole('button', { name: /Save Definition/i }));

    expect(onSaveDefinition).toHaveBeenCalledWith({
      name: 'Weekly moderation report',
      description: null,
      scope: {
        date_from: '2026-03-01',
        date_to: '2026-03-07',
        submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
      },
      columns: [{ key: 'gmv', label: 'GMV', type: 'number' }],
    });
  });
});
