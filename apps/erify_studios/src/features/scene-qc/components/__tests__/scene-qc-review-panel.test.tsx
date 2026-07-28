import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SceneQcDailyItemDetail } from '@eridu/api-types/scene-qc';

import { SceneQcReviewPanel } from '../scene-qc-review-panel';

function makeDetail(overrides: Partial<SceneQcDailyItemDetail['allowed_actions']> = {}): SceneQcDailyItemDetail {
  return {
    show: { id: 'show_1', name: 'Morning Show', scheduled_start_time: '2026-06-01T00:00:00.000Z', client: null, platforms: [] },
    operational_window: { operational_date: '2026-06-01', window_start: '2026-05-31T23:00:00.000Z', window_end: '2026-06-01T23:00:00.000Z', timezone: 'Asia/Bangkok' },
    evidence: [],
    scene_profile: null,
    review: null,
    allowed_actions: { can_review: true, blocked_reason: null, ...overrides },
  };
}

function makeForm() {
  return {
    result: null,
    setResult: vi.fn(),
    feedback: '',
    setFeedback: vi.fn(),
    feedbackRequired: false,
    feedbackMissing: false,
    dirty: false,
    isSaving: false,
    conflictMessage: null,
    dismissConflict: vi.fn(),
    save: vi.fn(),
    selectUnusableImage: vi.fn(),
    canSave: false,
  };
}

describe('sceneQcReviewPanel', () => {
  it('renders the blocked panel and no result form when blocked_reason is NO_EVIDENCE', () => {
    render(
      <SceneQcReviewPanel
        detail={makeDetail({ can_review: false, blocked_reason: 'NO_EVIDENCE' })}
        isLoading={false}
        isError={false}
        form={makeForm()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /Save & next/i })).not.toBeInTheDocument();
  });

  it('renders an immutable message and no result form when blocked_reason is CONFIRMED', () => {
    render(
      <SceneQcReviewPanel
        detail={makeDetail({ can_review: false, blocked_reason: 'CONFIRMED' })}
        isLoading={false}
        isError={false}
        form={makeForm()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText(/confirmed and can no longer be edited/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save & next/i })).not.toBeInTheDocument();
  });

  it('renders an explicit not-eligible message and no result form when blocked_reason is NOT_ELIGIBLE', () => {
    render(
      <SceneQcReviewPanel
        detail={makeDetail({ can_review: false, blocked_reason: 'NOT_ELIGIBLE' })}
        isLoading={false}
        isError={false}
        form={makeForm()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText(/moved outside the selected operational day/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save & next/i })).not.toBeInTheDocument();
  });

  it('renders the result form when the Show is reviewable', () => {
    render(
      <SceneQcReviewPanel
        detail={makeDetail()}
        isLoading={false}
        isError={false}
        form={makeForm()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Save & next/i })).toBeInTheDocument();
  });
});
