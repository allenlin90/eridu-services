import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as idb from 'idb-keyval';
import { useImperativeHandle } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';

import { TaskExecutionSheet } from '../task-execution-sheet';

const mockMutateAsync = vi.fn();

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('@eridu/ui', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
  Button: ({ children, onClick, disabled }: any) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Progress: () => <div data-testid="progress" />,
  Sheet: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetDescription: ({ children }: any) => <p>{children}</p>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h1>{children}</h1>,
}));

vi.mock('@/features/tasks/hooks/use-update-my-task', () => ({
  useUpdateMyTask: () => ({
    mutateAsync: mockMutateAsync,
  }),
}));

vi.mock('@/components/json-form/json-form', () => ({
  JsonForm: ({ ref, values, onChange }: any) => {
    useImperativeHandle(ref, () => ({
      validateBeforeSubmit: vi.fn().mockResolvedValue(undefined),
      flushPendingFileUploads: vi.fn().mockResolvedValue(values),
      hasPendingFileUploads: vi.fn().mockReturnValue(false),
      hasBlockingFileIssues: vi.fn().mockReturnValue(false),
    }));

    return (
      <div>
        <pre data-testid="json-values">{JSON.stringify(values)}</pre>
        <button
          type="button"
          onClick={() => onChange?.({ ...values, loop_note: 'edited locally' })}
        >
          Change Form
        </button>
      </div>
    );
  },
}));

function createTask(overrides: Partial<TaskWithRelationsDto> = {}): TaskWithRelationsDto {
  return {
    id: 'task_1',
    uid: 'task_1',
    version: 1,
    status: 'PENDING',
    type: 'ACTIVE',
    description: 'Moderation checklist',
    content: {},
    metadata: {},
    due_date: null,
    completed_at: null,
    created_at: '2026-03-04T00:00:00.000Z',
    updated_at: '2026-03-04T00:00:00.000Z',
    assignee: null,
    show: null,
    template: { name: 'Moderation Template' } as TaskWithRelationsDto['template'],
    snapshot: {
      schema: {
        items: [
          {
            id: 'field_1',
            key: 'loop_note',
            type: 'text',
            label: 'Loop Note',
            required: true,
            group: 'l1',
          },
        ],
        metadata: {
          loops: [{ id: 'l1', name: 'Loop 1', durationMin: 15 }],
        },
      },
    } as TaskWithRelationsDto['snapshot'],
    ...overrides,
  } as unknown as TaskWithRelationsDto;
}

describe('taskExecutionSheet local draft persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue(undefined);
    vi.mocked(idb.get).mockResolvedValue(undefined);
  });

  it('hydrates form values from IndexedDB draft on open', async () => {
    vi.mocked(idb.get).mockResolvedValue({
      taskId: 'task_1',
      content: { loop_note: 'restored draft' },
      baseContent: {},
      baseVersion: 1,
      updatedAt: '2026-03-04T00:00:00.000Z',
    });

    render(
      <TaskExecutionSheet
        task={createTask()}
        onClose={vi.fn()}
        studioId="studio_1"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('json-values')).toHaveTextContent('"loop_note":"restored draft"');
    });
  });

  it('persists local draft to IndexedDB after form change', async () => {
    const user = userEvent.setup();

    render(
      <TaskExecutionSheet
        task={createTask()}
        onClose={vi.fn()}
        studioId="studio_1"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Change Form' }));

    await waitFor(() => {
      expect(idb.set).toHaveBeenCalledWith(
        'my_task_execution_draft:task_1',
        expect.objectContaining({
          taskId: 'task_1',
          content: expect.objectContaining({ loop_note: 'edited locally' }),
          baseVersion: 1,
        }),
      );
    }, { timeout: 2000 });
  });

  it('clears local draft after successful submit', async () => {
    const user = userEvent.setup();

    render(
      <TaskExecutionSheet
        task={createTask()}
        onClose={vi.fn()}
        studioId="studio_1"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Submit for Review' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(idb.del).toHaveBeenCalledWith('my_task_execution_draft:task_1');
    });
  });
});
