import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as idb from 'idb-keyval';
import { useImperativeHandle } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TASK_ACTION, type TaskWithRelationsDto } from '@eridu/api-types/task-management';

import { StudioTaskActionSheet } from '../studio-task-action-sheet';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({
    data: undefined,
    isLoading: false,
  }),
}));

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@eridu/ui', () => ({
  Sheet: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h1>{children}</h1>,
  SheetDescription: ({ children }: any) => <p>{children}</p>,
  Progress: () => <div data-testid="progress" />,
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
  Textarea: ({ id, value, onChange, placeholder, className }: any) => (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  ),
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/json-form/json-form', () => ({
  JsonForm: ({ ref, activeGroup }: any) => {
    useImperativeHandle(ref, () => ({
      validateBeforeSubmit: vi.fn().mockResolvedValue({ proof: 'ok' }),
      flushPendingFileUploads: vi.fn().mockResolvedValue({ proof: 'ok' }),
      hasPendingFileUploads: vi.fn().mockReturnValue(false),
      hasBlockingFileIssues: vi.fn().mockReturnValue(false),
    }));
    return (
      <div data-testid="json-form">
        mock-form:
        {activeGroup ?? 'all'}
      </div>
    );
  },
}));

function createTask(schema: Record<string, unknown> = { items: [] }): TaskWithRelationsDto {
  return {
    id: 'task_1',
    uid: 'task_1',
    version: 1,
    status: 'PENDING',
    type: 'ACTIVE',
    description: 'Upload proof',
    content: {},
    metadata: {},
    created_at: '2026-03-03T00:00:00.000Z',
    updated_at: '2026-03-03T00:00:00.000Z',
    snapshot: {
      schema,
    },
    show: null,
    template: null,
    due_date: null,
    completed_at: null,
  } as unknown as TaskWithRelationsDto;
}

describe('studioTaskActionSheet draft clearing', () => {
  it('keeps IndexedDB draft when submit callback does not report success', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <StudioTaskActionSheet
        studioId="studio_1"
        open
        task={createTask()}
        action={TASK_ACTION.SUBMIT_FOR_REVIEW}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Submit for Review' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const options = onSubmit.mock.calls[0]?.[4];
    expect(options).toEqual(expect.objectContaining({ onSuccess: expect.any(Function) }));
    expect(idb.del).not.toHaveBeenCalled();
  });

  it('clears IndexedDB draft only after success callback is called', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((_task, _action, _content, _note, options) => {
      options?.onSuccess?.();
    });

    render(
      <StudioTaskActionSheet
        studioId="studio_1"
        open
        task={createTask()}
        action={TASK_ACTION.SUBMIT_FOR_REVIEW}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Submit for Review' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(idb.del).toHaveBeenCalledWith('studio_task_action_draft:task_1:SUBMIT_FOR_REVIEW');
    });
  });

  it('uses grouped moderation navigation for looped schema on submit for review', async () => {
    const user = userEvent.setup();

    render(
      <StudioTaskActionSheet
        studioId="studio_1"
        open
        task={createTask({
          items: [
            {
              id: 'field_loop_1',
              key: 'loop_1_note',
              type: 'text',
              label: 'Loop 1 Note',
              required: false,
              group: 'l1',
            },
            {
              id: 'field_loop_2',
              key: 'loop_2_note',
              type: 'text',
              label: 'Loop 2 Note',
              required: false,
              group: 'l2',
            },
          ],
          metadata: {
            loops: [
              { id: 'l1', name: 'Loop 1', durationMin: 15 },
              { id: 'l2', name: 'Loop 2', durationMin: 15 },
            ],
          },
        })}
        action={TASK_ACTION.SUBMIT_FOR_REVIEW}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('Loop Progress')).toBeInTheDocument();
    expect(screen.getByTestId('json-form')).toHaveTextContent('mock-form:l1');

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(screen.getByTestId('json-form')).toHaveTextContent('mock-form:l2');
    });
  });
});
