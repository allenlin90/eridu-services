import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { SceneReviewListItem } from '@eridu/api-types/task-management';

import { SceneReviewQueue } from '../scene-review-queue';

const item: SceneReviewListItem = {
  task_id: 'task_scene-review',
  task_type: 'SETUP',
  status: 'REVIEW',
  submitted_at: '2026-07-23T03:00:00.000Z',
  activity_at: '2026-07-23T03:00:00.000Z',
  show: {
    id: 'show_morning',
    name: 'Morning Beauty Live',
    start_time: '2026-07-23T03:00:00.000Z',
  },
  client: {
    id: 'client_acme',
    name: 'Acme Beauty',
  },
  platforms: [{ id: 'platform_tiktok', name: 'TikTok' }],
  metrics: {},
  preview: {
    key: 'final',
    label: 'Final scene',
    url: 'https://example.com/scene.jpg',
  },
  evidence_count: 2,
  evidence_labels: ['Final scene', 'Close-up'],
  reference_available: false,
};

describe('sceneReviewQueue', () => {
  it('selects evidence and pages through the bounded queue', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onPageChange = vi.fn();

    render(
      <SceneReviewQueue
        items={[item]}
        mode="qc-inbox"
        selectedTaskId={item.task_id}
        page={2}
        totalPages={3}
        isLoading={false}
        isError={false}
        onSelect={onSelect}
        onPageChange={onPageChange}
      />,
    );

    const evidenceButton = screen.getByRole('button', { name: /Morning Beauty Live/i });
    expect(evidenceButton).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('REVIEW')).toBeInTheDocument();

    await user.click(evidenceButton);
    await user.click(screen.getByRole('button', { name: 'Next evidence page' }));

    expect(onSelect).toHaveBeenCalledWith(item.task_id);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('shows a truthful empty state when no submitted screenshots match', () => {
    render(
      <SceneReviewQueue
        items={[]}
        mode="analysis"
        page={1}
        totalPages={0}
        isLoading={false}
        isError={false}
        onSelect={vi.fn()}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText('No matching screenshots')).toBeInTheDocument();
  });
});
