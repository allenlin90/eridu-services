import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { STUDIO_CREATOR_ROSTER_ERROR } from '@eridu/api-types/studio-creators';

import { ShowCreatorList } from '../show-creator-list';

const mockUseStudioAccess = vi.fn();
const mockUseShowCreatorsQuery = vi.fn();
const mockUseShowCreatorCompensationSummary = vi.fn();
const mockUseBulkAssignShowCreators = vi.fn();
const mockUseRemoveShowCreator = vi.fn();

vi.mock('@eridu/ui', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type={props.type ?? 'button'} {...props}>{children}</button>,
  DataTable: ({
    data,
    columns,
    renderToolbar,
  }: {
    data?: any[];
    columns?: any[];
    renderToolbar?: () => ReactNode;
  }) => (
    <div>
      {renderToolbar?.()}
      {data?.map((item) => (
        <div key={item.id}>
          {columns?.map((column) => (
            <div key={column.id ?? column.accessorKey}>
              {typeof column.cell === 'function'
                ? column.cell({ row: { original: item } })
                : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/hooks/use-studio-access', () => ({
  useStudioAccess: (...args: unknown[]) => mockUseStudioAccess(...args),
}));

vi.mock('@/features/studio-show-creators/api/get-show-creators', () => ({
  useShowCreatorsQuery: (...args: unknown[]) => mockUseShowCreatorsQuery(...args),
  useShowCreatorCompensationSummary: (...args: unknown[]) => mockUseShowCreatorCompensationSummary(...args),
}));

vi.mock('@/features/studio-show-creators/api/bulk-assign-show-creators', () => ({
  useBulkAssignShowCreators: (...args: unknown[]) => mockUseBulkAssignShowCreators(...args),
}));

vi.mock('@/features/studio-show-creators/api/remove-show-creator', () => ({
  useRemoveShowCreator: (...args: unknown[]) => mockUseRemoveShowCreator(...args),
}));

vi.mock('@/features/studio-show-creators/components/add-creator-dialog', () => ({
  AddCreatorDialog: ({ onSubmit }: { onSubmit: (input: { creator_id: string }) => void }) => (
    <button type="button" onClick={() => onSubmit({ creator_id: 'creator_1' })}>
      trigger-add-creator
    </button>
  ),
}));

vi.mock('@/features/studio-show-creators/components/show-creator-compensation-dialog', () => ({
  ShowCreatorCompensationDialog: ({ open, creator }: { open: boolean; creator: { id: string } | null }) => (
    open
      ? (
          <div>
            compensation-dialog-target:
            {creator?.id}
          </div>
        )
      : null
  ),
}));

describe('showCreatorList', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseStudioAccess.mockReturnValue({ role: STUDIO_ROLE.ADMIN });

    mockUseShowCreatorsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    mockUseShowCreatorCompensationSummary.mockReturnValue({
      data: {
        show_id: 'show_1',
        creators: [],
        total_amount: '0.00',
        unresolved_count: 0,
      },
    });

    mockUseBulkAssignShowCreators.mockReturnValue({
      mutate: vi.fn((_payload: unknown, options?: { onSuccess?: (result: any) => void }) => {
        options?.onSuccess?.({
          assigned: 0,
          skipped: 0,
          failed: [{ creator_id: 'creator_1', reason: STUDIO_CREATOR_ROSTER_ERROR.CREATOR_NOT_IN_ROSTER }],
        });
      }),
      isPending: false,
    });

    mockUseRemoveShowCreator.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('surfaces typed roster failure copy for single-show add attempts', async () => {
    const user = userEvent.setup();

    render(
      <ShowCreatorList
        studioId="std_1"
        showId="show_1"
        showStartTime="2026-03-20T10:00:00.000Z"
        showEndTime="2026-03-20T12:00:00.000Z"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'trigger-add-creator' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Add failed: Creator is not in this studio roster. Add them to the roster first.',
    );
  });

  it('renders backend creator compensation totals and opens dialog with assignment UID', async () => {
    const user = userEvent.setup();
    mockUseShowCreatorsQuery.mockReturnValue({
      data: [
        {
          id: 'show_mc_1',
          creator_id: 'creator_1',
          creator_name: 'Alice',
          creator_alias_name: 'Ali',
          note: null,
          agreed_rate: '150.00',
          compensation_type: 'FIXED',
          commission_rate: null,
          metadata: {},
        },
      ],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    mockUseShowCreatorCompensationSummary.mockReturnValue({
      data: {
        show_id: 'show_1',
        creators: [],
        total_amount: '175.00',
        unresolved_count: 0,
      },
    });

    render(
      <ShowCreatorList
        studioId="std_1"
        showId="show_1"
        showStartTime="2026-03-20T10:00:00.000Z"
        showEndTime="2026-03-20T12:00:00.000Z"
      />,
    );

    expect(screen.getByText('Creator compensation total')).toBeInTheDocument();
    expect(screen.getByText('175.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Manage compensation for Alice' }));

    expect(screen.getByText('compensation-dialog-target:show_mc_1')).toBeInTheDocument();
  });
});
