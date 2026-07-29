import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SceneQcTabs } from '../scene-qc-tabs';

describe('sceneQcTabs', () => {
  it('the Records tab is enabled (not disabled/"Soon") -- Child PR 4 discharges Child PR 3 OQ-7', () => {
    render(<SceneQcTabs tab="daily" onTabChange={vi.fn()} />);

    const recordsButton = screen.getByRole('button', { name: 'Records' });
    expect(recordsButton).not.toBeDisabled();
    expect(screen.queryByText('Soon')).not.toBeInTheDocument();
  });

  it('calls onTabChange("records") when the Records tab is clicked', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(<SceneQcTabs tab="daily" onTabChange={onTabChange} />);

    await user.click(screen.getByRole('button', { name: 'Records' }));
    expect(onTabChange).toHaveBeenCalledWith('records');
  });

  it('calls onTabChange("daily") when the Daily Review tab is clicked', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(<SceneQcTabs tab="records" onTabChange={onTabChange} />);

    await user.click(screen.getByRole('button', { name: 'Daily Review' }));
    expect(onTabChange).toHaveBeenCalledWith('daily');
  });
});
