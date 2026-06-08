import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PerformanceSummaryResponse, ShowPerformanceSeriesResponse } from '@eridu/api-types/performance';

import { PerformanceTrendGraph } from '../performance-trend-graph';

const emptySummary: PerformanceSummaryResponse = {
  total_gmv: '0.00',
  total_views: 0,
  avg_ctr: '0.00',
  avg_cto: '0.00',
  recorded_shows_count: 0,
  total_shows_count: 0,
  trend: [],
  currency: 'THB',
  locale: 'th-TH',
};

const emptySeries: ShowPerformanceSeriesResponse = {
  shows: [],
  currency: 'THB',
  locale: 'th-TH',
};

const baseProps = {
  data: emptySummary,
  isLoading: false,
  seriesData: emptySeries,
  seriesLoading: false,
  clientSelector: <div>client-selector</div>,
};

describe('performanceTrendGraph', () => {
  it('renders the daily empty state and a mode toggle', () => {
    render(<PerformanceTrendGraph {...baseProps} mode="daily" onModeChange={vi.fn()} />);

    expect(screen.getByText('Daily Performance Trend')).toBeInTheDocument();
    expect(screen.getByText(/No trend data available/i)).toBeInTheDocument();
    // Daily metric set only.
    expect(screen.getByRole('button', { name: 'GMV' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Peak CTR' })).not.toBeInTheDocument();
  });

  it('switches to By-Show mode via the mode toggle', () => {
    const onModeChange = vi.fn();
    render(<PerformanceTrendGraph {...baseProps} mode="daily" onModeChange={onModeChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'By Show' }));
    expect(onModeChange).toHaveBeenCalledWith('by_show');
  });

  it('renders the By-Show empty state, peak metric toggles, and client selector', () => {
    render(<PerformanceTrendGraph {...baseProps} mode="by_show" onModeChange={vi.fn()} />);

    expect(screen.getByText('Performance by Show')).toBeInTheDocument();
    expect(screen.getByText(/No shows in the selected range/i)).toBeInTheDocument();
    expect(screen.getByText('client-selector')).toBeInTheDocument();
    // By-Show metric set includes the peak rate metrics.
    expect(screen.getByRole('button', { name: 'Peak CTR' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Peak CTO' })).toBeInTheDocument();
  });
});
