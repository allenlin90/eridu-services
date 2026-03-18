import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TaskReportsIndex } from '../task-reports-index';

// Mock dependencies
vi.mock('@/lib/hooks/use-studio-shows', () => ({
  useStudioShows: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/features/clients/hooks/use-clients', () => ({
  useClientsQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/features/memberships/hooks/use-studio-memberships', () => ({
  useStudioMembershipsQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

vi.mock('../../hooks/use-task-report-sources', () => ({
  useTaskReportSources: vi.fn(() => ({
    data: {
      shared_fields: [
        { key: 'col1', label: 'Column 1', group: 'General', type: 'string' },
      ],
      sources: [],
    },
    isLoading: false,
  })),
}));

const mockPreflightMutateAsync = vi.fn();
const mockRunMutateAsync = vi.fn();

vi.mock('../../hooks/use-task-report-mutations', () => ({
  useTaskReportMutations: vi.fn(() => ({
    preflightMutation: {
      mutateAsync: mockPreflightMutateAsync,
      isPending: false,
      data: null,
    },
    runMutation: {
      mutateAsync: mockRunMutateAsync,
      isPending: false,
    },
  })),
}));

describe('report builder integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('switches from list view to builder when create button is clicked', async () => {
    const user = userEvent.setup();
    const setView = vi.fn();

    render(
      <TaskReportsIndex
        view="list"
        setView={setView}
        activeDefinitionId={null}
        setActiveDefinitionId={vi.fn()}
        draftScope={null}
        setDraftScope={vi.fn()}
        draftColumns={[]}
        setDraftColumns={vi.fn()}
        reportResult={null}
        setReportResult={vi.fn()}
        studioId="studio_123"
      />,
    );

    await user.click(screen.getByRole('button', { name: /Create New Report/i }));

    expect(setView).toHaveBeenCalledWith('builder');
  });

  it('renders the builder view by default', () => {
    render(
      <TaskReportsIndex
        view="builder"
        setView={vi.fn()}
        activeDefinitionId={null}
        setActiveDefinitionId={vi.fn()}
        draftScope={null}
        setDraftScope={vi.fn()}
        draftColumns={[]}
        setDraftColumns={vi.fn()}
        reportResult={null}
        setReportResult={vi.fn()}
        studioId="studio_123"
      />,
    );

    // Should see step headers
    expect(screen.getByText('1. Select Shows')).toBeInTheDocument();
    expect(screen.getByText('2. Select Columns')).toBeInTheDocument();
  });

  it('runs preflight and transitions to preflight result', async () => {
    const user = userEvent.setup();
    const setReportResult = vi.fn();

    // Setup a valid draft state to enable the button
    const validScope = { submitted_statuses: ['COMPLETED' as const], show_ids: ['show_1'] };
    const validColumns = [{ key: 'col1', label: 'Col 1', sourceId: 'system', group: 'Gen' }];

    mockPreflightMutateAsync.mockResolvedValueOnce({
      show_count: 5,
      task_count: 150,
      estimated_rows: 150,
      warnings: [],
    });

    render(
      <TaskReportsIndex
        view="builder"
        setView={vi.fn()}
        activeDefinitionId={null}
        setActiveDefinitionId={vi.fn()}
        draftScope={validScope}
        setDraftScope={vi.fn()}
        draftColumns={validColumns as any}
        setDraftColumns={vi.fn()}
        reportResult={null}
        setReportResult={setReportResult}
        studioId="studio_123"
      />,
    );

    const preflightBtn = screen.getByRole('button', { name: /Preflight & Run/i });
    expect(preflightBtn).toBeInTheDocument();
    expect(preflightBtn).not.toBeDisabled();

    await user.click(preflightBtn);
    expect(mockPreflightMutateAsync).toHaveBeenCalled();

    // The UI should now show "Confirm & Run"
    const confirmBtn = await screen.findByRole('button', { name: /Confirm & Run/i });
    expect(confirmBtn).toBeInTheDocument();

    // Now mock the run result and click Confirm
    mockRunMutateAsync.mockResolvedValueOnce({
      columns: validColumns,
      rows: [
        { col1: 'Row 1 Data' },
      ],
    });

    await user.click(confirmBtn);
    expect(mockRunMutateAsync).toHaveBeenCalled();

    // The setReportResult should be called with the mock run result
    expect(setReportResult).toHaveBeenCalledWith({
      columns: validColumns,
      rows: [
        { col1: 'Row 1 Data' },
      ],
    });
  });
});
