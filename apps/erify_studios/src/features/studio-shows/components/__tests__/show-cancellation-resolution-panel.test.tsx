import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StudioShowDetail, StudioShowStateGate } from '@eridu/api-types/shows';

import { ShowCancellationResolutionPanel } from '../show-cancellation-resolution-panel';

const useStudioShowStateGateMock = vi.hoisted(() => vi.fn(() => ({ data: null })));

vi.mock('../../api/get-studio-show-state-gate', () => ({
  useStudioShowStateGate: useStudioShowStateGateMock,
}));

vi.mock('../../api/cancel-studio-show', () => ({
  useCancelStudioShowWithResolution: () => ({ mutate: vi.fn(), isPending: false }),
  useResolveStudioShowCancellation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/features/studio-members/api/members', () => ({
  useStudioMembers: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock('@/components/responsive-dialog', () => ({
  ResponsiveDialog: ({ open, title, children, footer }: any) =>
    open
      ? (
          <div role="dialog" aria-label={String(title)}>
            {children}
            {footer}
          </div>
        )
      : null,
}));

vi.mock('@eridu/ui', () => {
  return {
    AsyncCombobox: ({ placeholder }: any) => <button type="button">{placeholder}</button>,
    Badge: ({ children }: any) => <span>{children}</span>,
    Button: ({ children, onClick, disabled, type = 'button', ...rest }: any) => (
      <button type={type} onClick={onClick} disabled={disabled} {...rest}>
        {children}
      </button>
    ),
    Label: ({ children }: any) => <label>{children}</label>,
    ResponsiveDateTimePicker: ({ value, onChange }: any) => (
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    ),
    Select: ({ children }: any) => <div>{children}</div>,
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: ({ children }: any) => <div>{children}</div>,
    SelectTrigger: ({ children }: any) => <button type="button">{children}</button>,
    SelectValue: () => <span />,
    Textarea: (props: any) => <textarea {...props} />,
  };
});

function makeShow(overrides: Partial<StudioShowDetail> = {}): StudioShowDetail {
  return {
    id: 'show_1',
    name: 'Morning Launch',
    client_id: 'client_1',
    client_name: 'Acme',
    schedule_id: null,
    schedule_name: null,
    studio_id: 'studio_1',
    studio_name: 'Studio One',
    studio_room_id: null,
    studio_room_name: null,
    show_type_id: 'type_1',
    show_type_name: 'Live',
    show_status_id: 'status_1',
    show_status_name: 'Live',
    show_status_system_key: 'LIVE',
    show_standard_id: 'standard_1',
    show_standard_name: 'Premium',
    start_time: '2026-04-01T09:00:00.000Z',
    end_time: '2026-04-01T10:00:00.000Z',
    actual_start_time: null,
    actual_end_time: null,
    metadata: {},
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    platforms: [],
    ...overrides,
  };
}

describe('showCancellationResolutionPanel', () => {
  beforeEach(() => {
    useStudioShowStateGateMock.mockReturnValue({ data: null });
  });

  it('renders the cancel action for a cancellable show', () => {
    render(<ShowCancellationResolutionPanel studioId="studio_1" show={makeShow()} />);

    expect(screen.getByRole('button', { name: /cancel for resolution/i })).toBeInTheDocument();
  });

  it('renders nothing for a draft show', () => {
    const { container } = render(
      <ShowCancellationResolutionPanel
        studioId="studio_1"
        show={makeShow({ show_status_system_key: 'DRAFT' })}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the route is read-only', () => {
    const { container } = render(
      <ShowCancellationResolutionPanel studioId="studio_1" show={makeShow()} isReadOnly />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders pending gate context and history', async () => {
    useStudioShowStateGateMock.mockReturnValue({
      data: {
        id: 'task_gate1',
        gate_kind: 'schedule_publish_removal',
        reason_category: 'REMOVED_FROM_REPUBLISHED_SCHEDULE',
        reason_note: 'Removed from republished schedule',
        follow_up_notes: null,
        resolution_notes: null,
        assignee_id: null,
        assignee_name: null,
        from_status: 'CONFIRMED',
        allowed_outcomes: ['CANCELLED', 'RESTORE_PREVIOUS'],
        history: [
          {
            event: 'opened',
            actor_id: null,
            at: '2026-04-01T00:00:00.000Z',
            note: 'Removed from republished schedule',
          },
        ],
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
      } satisfies NonNullable<StudioShowStateGate>,
    } as any);

    render(
      <ShowCancellationResolutionPanel
        studioId="studio_1"
        show={makeShow({ show_status_system_key: 'CANCELLED_PENDING_RESOLUTION' })}
      />,
    );

    expect(screen.getByText('Pending resolution')).toBeInTheDocument();
    expect(screen.getAllByText('Removed from republished schedule')).toHaveLength(2);
    expect(screen.getByText('Gate History')).toBeInTheDocument();
    expect(screen.getByText('Opened')).toBeInTheDocument();
  });
});
