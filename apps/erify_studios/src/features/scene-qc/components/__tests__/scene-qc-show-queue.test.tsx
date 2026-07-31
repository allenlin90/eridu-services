import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { SceneQcDailyItem } from '@eridu/api-types/scene-qc';

import { SceneQcShowQueue } from '../scene-qc-show-queue';

function buildItem(overrides: Partial<SceneQcDailyItem> = {}): SceneQcDailyItem {
  return {
    show_id: 'show_1',
    show_name: 'Morning Beauty Live',
    scheduled_start_time: '2026-06-01T10:00:00.000Z',
    client: { id: 'client_1', name: 'Acme Beauty' },
    platforms: [{ id: 'plt_1', name: 'TikTok' }],
    evidence_count: 2,
    has_scene_profile: true,
    is_blocked: false,
    result: null,
    has_feedback: false,
    reviewed_by: null,
    reviewed_at: null,
    review_id: null,
    review_version: null,
    is_confirmed: false,
    ...overrides,
  };
}

describe('sceneQcShowQueue', () => {
  it('renders loading skeletons', () => {
    const { container } = render(
      <SceneQcShowQueue items={[]} selectedShowId={undefined} page={1} totalPages={0} isLoading isError={false} filtersActive={false} onSelect={vi.fn()} onPageChange={vi.fn()} />,
    );
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
  });

  it('renders an error state', () => {
    render(
      <SceneQcShowQueue items={[]} selectedShowId={undefined} page={1} totalPages={0} isLoading={false} isError filtersActive={false} onSelect={vi.fn()} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText(/Unable to load the Scene QC queue/i)).toBeInTheDocument();
  });

  it('renders the day-empty state when there are no filters active', () => {
    render(
      <SceneQcShowQueue items={[]} selectedShowId={undefined} page={1} totalPages={0} isLoading={false} isError={false} filtersActive={false} onSelect={vi.fn()} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText(/No Shows for this operational day/i)).toBeInTheDocument();
  });

  it('renders the filtered-empty state distinctly when filters are active', () => {
    render(
      <SceneQcShowQueue items={[]} selectedShowId={undefined} page={1} totalPages={0} isLoading={false} isError={false} filtersActive onSelect={vi.fn()} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText(/No Shows match these filters/i)).toBeInTheDocument();
  });

  it('shows a Blocked chip for a zero-evidence Show', () => {
    render(
      <SceneQcShowQueue items={[buildItem({ is_blocked: true, evidence_count: 0 })]} selectedShowId={undefined} page={1} totalPages={1} isLoading={false} isError={false} filtersActive={false} onSelect={vi.fn()} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('shows the selected row as aria-current and calls onSelect on click', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SceneQcShowQueue items={[buildItem()]} selectedShowId="show_1" page={1} totalPages={1} isLoading={false} isError={false} filtersActive={false} onSelect={onSelect} onPageChange={vi.fn()} />,
    );

    const row = screen.getByRole('button', { name: /Morning Beauty Live/i });
    expect(row).toHaveAttribute('aria-current', 'true');

    await user.click(row);
    expect(onSelect).toHaveBeenCalledWith('show_1');
  });

  it('pages through when totalPages > 1', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <SceneQcShowQueue items={[buildItem()]} selectedShowId={undefined} page={1} totalPages={3} isLoading={false} isError={false} filtersActive={false} onSelect={vi.fn()} onPageChange={onPageChange} />,
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
