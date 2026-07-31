import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SceneQcDailySummary } from '@eridu/api-types/scene-qc';

import type { useSceneQcConfirmation } from '../../hooks/use-scene-qc-confirmation';
import { SceneQcConfirmationCard } from '../scene-qc-confirmation-card';

function buildSummary(overrides: Partial<SceneQcDailySummary> = {}): SceneQcDailySummary {
  return {
    operational_date: '2026-06-01',
    window_start: '2026-05-31T23:00:00.000Z',
    window_end: '2026-06-01T23:00:00.000Z',
    timezone: 'Asia/Bangkok',
    eligible_count: 3,
    reviewed_count: 3,
    pass_count: 3,
    minor_count: 0,
    fail_count: 0,
    blocked_no_evidence_count: 0,
    remaining_count: 0,
    confirmation: 'UNCONFIRMED',
    confirmation_id: null,
    confirmation_revision: null,
    confirmed_by: null,
    confirmed_at: null,
    confirmation_added_show_count: null,
    confirmation_removed_show_count: null,
    confirmation_changed_review_count: null,
    ...overrides,
  };
}

function buildConfirmation(overrides: Partial<ReturnType<typeof useSceneQcConfirmation>> = {}): ReturnType<typeof useSceneQcConfirmation> {
  return {
    confirm: vi.fn(),
    isPending: false,
    error: null,
    dayComplete: true,
    canConfirm: true,
    canReconfirm: false,
    reportConfirmationId: null,
    ...overrides,
  };
}

describe('sceneQcConfirmationCard', () => {
  it('renders loading skeleton when the summary is not yet available', () => {
    const { container } = render(
      <SceneQcConfirmationCard summary={undefined} isLoading confirmation={buildConfirmation()} onOpenReport={vi.fn()} />,
    );
    expect(container.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
  });

  it('when UNCONFIRMED and the day is incomplete, Confirm button disabled, with a remaining/blocker explanation', () => {
    const summary = buildSummary({ confirmation: 'UNCONFIRMED', remaining_count: 2, reviewed_count: 1, blocked_no_evidence_count: 1 });
    const confirmation = buildConfirmation({ canConfirm: false, dayComplete: false });

    render(<SceneQcConfirmationCard summary={summary} isLoading={false} confirmation={confirmation} onOpenReport={vi.fn()} />);

    const button = screen.getByRole('button', { name: /Confirm day/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/2 Show\(s\) still need review/)).toBeInTheDocument();
    expect(screen.getByText(/1 Show\(s\) are blocked/)).toBeInTheDocument();
  });

  it('when UNCONFIRMED and the day is complete, Confirm button enabled and calls confirm on click', async () => {
    const summary = buildSummary({ confirmation: 'UNCONFIRMED' });
    const confirm = vi.fn();
    const confirmation = buildConfirmation({ canConfirm: true, confirm });

    render(<SceneQcConfirmationCard summary={summary} isLoading={false} confirmation={confirmation} onOpenReport={vi.fn()} />);

    const button = screen.getByRole('button', { name: /Confirm day/i });
    expect(button).not.toBeDisabled();
    button.click();
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('when CURRENT, shows an immutable banner with actor/time/revision and an enabled "Open current report" action', () => {
    const summary = buildSummary({
      confirmation: 'CURRENT',
      confirmation_id: 'scqcc_1',
      confirmation_revision: 2,
      confirmed_by: { id: 'user_1', name: 'Manager One' },
      confirmed_at: '2026-06-01T10:00:00.000Z',
    });
    const onOpenReport = vi.fn();

    render(<SceneQcConfirmationCard summary={summary} isLoading={false} confirmation={buildConfirmation()} onOpenReport={onOpenReport} />);

    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText(/Manager One/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Open current report/i });
    expect(button).not.toBeDisabled();
    button.click();
    expect(onOpenReport).toHaveBeenCalledWith('scqcc_1');
  });

  it('when STALE, the warning banner lists added/removed counts, current-report action disabled, and Reconfirm disabled until scope complete', () => {
    const summary = buildSummary({
      confirmation: 'STALE',
      confirmation_revision: 1,
      confirmation_added_show_count: 2,
      confirmation_removed_show_count: 1,
      confirmation_changed_review_count: 0,
      remaining_count: 1,
    });
    const confirmation = buildConfirmation({ canReconfirm: false, dayComplete: false });

    render(<SceneQcConfirmationCard summary={summary} isLoading={false} confirmation={confirmation} onOpenReport={vi.fn()} />);

    expect(screen.getByText('Stale confirmation')).toBeInTheDocument();
    expect(screen.getByText(/2 added, 1 removed/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reconfirm/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Open current report/i })).toBeDisabled();
  });

  it('when STALE, Reconfirm becomes enabled once the scope is complete', () => {
    const summary = buildSummary({ confirmation: 'STALE', confirmation_revision: 1 });
    const confirmation = buildConfirmation({ canReconfirm: true, dayComplete: true });

    render(<SceneQcConfirmationCard summary={summary} isLoading={false} confirmation={confirmation} onOpenReport={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Reconfirm/i })).not.toBeDisabled();
  });
});
