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
const mockUseBulkAssignShowCreators = vi.fn();
const mockUseRemoveShowCreator = vi.fn();

vi.mock('@eridu/ui', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type={props.type ?? 'button'} {...props}>{children}</button>,
  DataTable: ({ renderToolbar }: { renderToolbar?: () => ReactNode }) => (
    <div>
      {renderToolbar?.()}
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
}));

vi.mock('@/features/studio-show-creators/api/bulk-assign-show-creators', () => ({
  useBulkAssignShowCreators: (...args: unknown[]) => mockUseBulkAssignShowCreators(...args),
}));

vi.mock('@/features/studio-show-creators/api/remove-show-creator', () => ({
  useRemoveShowCreator: (...args: unknown[]) => mockUseRemoveShowCreator(...args),
}));

vi.mock('@/features/studio-show-creators/components/add-creator-dialog', () => ({
  AddCreatorDialog: ({ onSubmit }: { onSubmit: (creatorId: string) => void }) => (
    <button type="button" onClick={() => onSubmit('creator_1')}>
      trigger-add-creator
    </button>
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
});
