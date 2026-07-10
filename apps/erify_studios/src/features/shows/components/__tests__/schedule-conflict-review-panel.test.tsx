import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SchedulePublishImpactRow } from '@eridu/api-types/shows';

import { ScheduleConflictReviewPanel } from '../schedule-conflict-review-panel';

import { apiClient } from '@/lib/api/client';
import * as m from '@/paraglide/messages';

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: vi.fn() },
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@eridu/ui/hooks/use-is-mobile', () => ({
  useIsMobile: () => false,
}));

const baseRow: SchedulePublishImpactRow = {
  audit_id: 'aud_1',
  impact_kind: 'stale_conflict',
  conflict_uid: 'conflict_1',
  conflict_type: 'update_held_back',
  resolution_status: 'pending',
  held_back: { show_fields: { changed_fields: ['name'], old: { name: 'A' }, new: { name: 'B' } }, show_creators: [], show_platforms: [], proposed_status_transition: null },
  schedule_id: null,
  external_id: 'EXT-1',
  changed_fields: ['name'],
  relation_changes: {},
  show: { id: 'show_1', name: 'Test Show', external_id: 'EXT-1', start_time: '2026-01-01T00:00:00.000Z', end_time: '2026-01-01T02:00:00.000Z', status_name: 'Draft', status_system_key: 'DRAFT', client_id: null, client_name: null },
  created_at: '2026-01-01T00:00:00.000Z',
};

function renderPanel(row: SchedulePublishImpactRow | null, onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(
    <ScheduleConflictReviewPanel studioId="studio_1" row={row} open={row !== null} onOpenChange={onOpenChange} />,
    { wrapper },
  );
}

describe('scheduleConflictReviewPanel', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it('disables Apply until a reason is entered', async () => {
    renderPanel(baseRow);
    const applyButton = screen.getByRole('button', { name: m.schedule_conflict_action_apply_edit() });
    expect(applyButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText(m.schedule_conflict_reason_label()), 'confirmed with planner');
    expect(applyButton).not.toBeDisabled();
  });

  it('submits apply with the entered reason', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ...baseRow, resolution_status: 'applied' } });
    const onOpenChange = vi.fn();
    renderPanel(baseRow, onOpenChange);

    await userEvent.type(screen.getByLabelText(m.schedule_conflict_reason_label()), 'confirmed with planner');
    await userEvent.click(screen.getByRole('button', { name: m.schedule_conflict_action_apply_edit() }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(
      '/studios/studio_1/shows/show_1/schedule-publish-impacts/conflict_1/resolve',
      { action: 'apply', reason: 'confirmed with planner' },
    ));
  });

  it('shows an inline banner and does not close the panel on SHOW_NO_LONGER_ELIGIBLE', async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'SHOW_NO_LONGER_ELIGIBLE' } },
    });
    const onOpenChange = vi.fn();
    renderPanel(baseRow, onOpenChange);

    await userEvent.type(screen.getByLabelText(m.schedule_conflict_reason_label()), 'confirmed with planner');
    await userEvent.click(screen.getByRole('button', { name: m.schedule_conflict_action_apply_edit() }));

    await waitFor(() => expect(screen.getByText(m.schedule_conflict_ineligible_banner())).toBeInTheDocument());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('shows a generic error toast and keeps the panel open on CONFLICT_STATE_CHANGED', async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'CONFLICT_STATE_CHANGED' } },
    });
    const onOpenChange = vi.fn();
    renderPanel(baseRow, onOpenChange);

    await userEvent.type(screen.getByLabelText(m.schedule_conflict_reason_label()), 'confirmed with planner');
    await userEvent.click(screen.getByRole('button', { name: m.schedule_conflict_action_apply_edit() }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'The show has changed since this conflict was opened. Refresh and review the latest data before resolving.',
    ));
    expect(screen.queryByText(m.schedule_conflict_ineligible_banner())).not.toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('renders nothing when row is null', () => {
    renderPanel(null);
    expect(screen.queryByText(m.schedule_conflict_reason_label())).not.toBeInTheDocument();
  });
});
