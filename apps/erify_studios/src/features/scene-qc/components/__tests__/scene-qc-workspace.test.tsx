import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SceneQcWorkspace } from '../scene-qc-workspace';

vi.mock('../scene-qc-daily-workspace', () => ({
  SceneQcDailyWorkspace: () => <div data-testid="daily-workspace" />,
}));
vi.mock('../scene-qc-records-view', () => ({
  SceneQcRecordsView: () => <div data-testid="records-view" />,
}));
vi.mock('../scene-qc-report-sheet', () => ({
  SceneQcReportSheet: () => <div data-testid="report-sheet" />,
}));

const BASE_SEARCH = { tab: 'daily' as const, review_state: 'all' as const, page: 3, limit: 20, show_id: 'show_1' };

describe('sceneQcWorkspace', () => {
  it('renders the daily workspace when tab=daily', () => {
    render(<SceneQcWorkspace studioId="studio_abc" search={BASE_SEARCH} onSearchChange={vi.fn()} />);
    expect(screen.getByTestId('daily-workspace')).toBeInTheDocument();
    expect(screen.queryByTestId('records-view')).not.toBeInTheDocument();
  });

  it('renders the records view when tab=records', () => {
    render(<SceneQcWorkspace studioId="studio_abc" search={{ ...BASE_SEARCH, tab: 'records' }} onSearchChange={vi.fn()} />);
    expect(screen.getByTestId('records-view')).toBeInTheDocument();
    expect(screen.queryByTestId('daily-workspace')).not.toBeInTheDocument();
  });

  it('switching to Records resets page to 1 and clears show_id, leaving client_id/platform_id untouched', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    render(
      <SceneQcWorkspace
        studioId="studio_abc"
        search={{ ...BASE_SEARCH, client_id: 'client_x', platform_id: 'plt_x' }}
        onSearchChange={onSearchChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Records' }));

    expect(onSearchChange).toHaveBeenCalledWith({ tab: 'records', page: 1, show_id: undefined });
  });

  it('switching to Daily resets page to 1 and clears record_id', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    render(
      <SceneQcWorkspace
        studioId="studio_abc"
        search={{ ...BASE_SEARCH, tab: 'records', page: 2, record_id: 'scqcr_1' }}
        onSearchChange={onSearchChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Daily Review' }));

    expect(onSearchChange).toHaveBeenCalledWith({ tab: 'daily', page: 1, record_id: undefined });
  });
});
