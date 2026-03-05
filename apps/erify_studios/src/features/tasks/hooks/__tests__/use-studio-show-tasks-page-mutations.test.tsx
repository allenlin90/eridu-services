import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStudioShowTasksPageMutations } from '@/features/tasks/hooks/use-studio-show-tasks-page-mutations';

const mockAssignMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockUpdateStatusMutate = vi.fn();
const mockUpdateTaskMutate = vi.fn();
const mockGetStudioShifts = vi.fn();
const mockToastWarning = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    warning: (...args: unknown[]) => mockToastWarning(...args),
  },
}));

vi.mock('@/features/studio-shifts/api/get-studio-shifts', () => ({
  getStudioShifts: (...args: unknown[]) => mockGetStudioShifts(...args),
}));

vi.mock('@/features/tasks/hooks/use-assign-task', () => ({
  useAssignTask: () => ({
    mutate: mockAssignMutate,
    isPending: false,
  }),
}));

vi.mock('@/features/tasks/hooks/use-delete-tasks', () => ({
  useDeleteTasks: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}));

vi.mock('@/features/tasks/hooks/use-update-studio-task-status', () => ({
  useUpdateStudioTaskStatus: () => ({
    mutate: mockUpdateStatusMutate,
    isPending: false,
    variables: undefined,
  }),
}));

vi.mock('@/features/tasks/hooks/use-update-studio-task', () => ({
  useUpdateStudioTask: () => ({
    mutate: mockUpdateTaskMutate,
    isPending: false,
  }),
}));

describe('useStudioShowTasksPageMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStudioShifts.mockResolvedValue({ data: [] });
  });

  it('warns when assignee has no overlapping shift but still assigns task', async () => {
    const { result } = renderHook(() =>
      useStudioShowTasksPageMutations({
        studioId: 'std_1',
        showId: 'show_1',
        showWindow: {
          name: 'Premium Show',
          start_time: '2026-03-05T10:00:00.000Z',
          end_time: '2026-03-05T11:00:00.000Z',
        },
        onDeleteSuccess: vi.fn(),
        onOpenTaskActionDraft: vi.fn(),
        onClearTaskActionDraft: vi.fn(),
        onClearDueDateTask: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleAssign({ id: 'task_1' } as never, 'usr_1');
    });

    expect(mockGetStudioShifts).toHaveBeenCalledWith(
      'std_1',
      expect.objectContaining({
        user_id: 'usr_1',
        page: 1,
        limit: 200,
      }),
    );
    expect(mockToastWarning).toHaveBeenCalledTimes(1);
    expect(mockAssignMutate).toHaveBeenCalledWith({
      taskId: 'task_1',
      assigneeUid: 'usr_1',
    });
  });

  it('skips coverage warning lookup when unassigning', async () => {
    const { result } = renderHook(() =>
      useStudioShowTasksPageMutations({
        studioId: 'std_1',
        showId: 'show_1',
        showWindow: {
          name: 'Premium Show',
          start_time: '2026-03-05T10:00:00.000Z',
          end_time: '2026-03-05T11:00:00.000Z',
        },
        onDeleteSuccess: vi.fn(),
        onOpenTaskActionDraft: vi.fn(),
        onClearTaskActionDraft: vi.fn(),
        onClearDueDateTask: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleAssign({ id: 'task_1' } as never, null);
    });

    expect(mockGetStudioShifts).not.toHaveBeenCalled();
    expect(mockToastWarning).not.toHaveBeenCalled();
    expect(mockAssignMutate).toHaveBeenCalledWith({
      taskId: 'task_1',
      assigneeUid: null,
    });
  });
});
