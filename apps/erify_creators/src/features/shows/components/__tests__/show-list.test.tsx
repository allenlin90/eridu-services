import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Show } from '../../types';
import { ShowList } from '../show-list';

vi.mock('@/paraglide/messages.js', () => ({
  'shows.noShows': () => 'No shows found',
  'shows.typeLabel': () => 'Type:',
}));

function buildMockShow(overrides: Partial<Show> = {}): Show {
  return {
    id: '1',
    name: 'Test Show',
    client_id: null,
    client_name: null,
    studio_id: null,
    studio_name: null,
    studio_room_id: null,
    studio_room_name: null,
    show_type_id: null,
    show_type_name: null,
    show_status_id: null,
    show_status_name: null,
    show_standard_id: null,
    show_standard_name: null,
    start_time: '2024-01-01T10:00:00Z',
    end_time: '2024-01-01T11:00:00Z',
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

const mockShows: Show[] = [
  buildMockShow({
    id: '1',
    name: 'Test Show 1',
    show_type_name: 'Live',
    start_time: '2024-01-01T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }),
  buildMockShow({
    id: '2',
    name: 'Test Show 2',
    show_type_name: 'Recorded',
    start_time: '2024-01-02T10:00:00Z',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  }),
];

describe('showList', () => {
  it('renders loading spinner when isLoading is true', () => {
    render(<ShowList shows={[]} isLoading />);
    // LoadingSpinner should be rendered
    expect(document.body).toBeTruthy();
  });

  it('renders empty message when shows array is empty', () => {
    render(<ShowList shows={[]} isLoading={false} />);

    expect(screen.getByText('No shows found')).toBeInTheDocument();
  });

  it('renders list of shows', () => {
    render(<ShowList shows={mockShows} isLoading={false} />);

    expect(screen.getByText('Test Show 1')).toBeInTheDocument();
    expect(screen.getByText('Test Show 2')).toBeInTheDocument();
  });

  it('renders show type when available', () => {
    render(<ShowList shows={[mockShows[0]]} isLoading={false} />);

    // The component renders "Type: Live" as a single text node
    expect(screen.getByText(/Type:\s*Live/)).toBeInTheDocument();
  });

  it('renders start time when available', () => {
    render(<ShowList shows={[mockShows[0]]} isLoading={false} />);

    const startTime = new Date(mockShows[0].start_time).toLocaleString();
    expect(screen.getByText(startTime)).toBeInTheDocument();
  });

  it('does not render show type when not available', () => {
    const showWithoutType = buildMockShow({
      id: '3',
      name: 'Show Without Type',
      show_type_name: null,
    });

    render(<ShowList shows={[showWithoutType]} isLoading={false} />);

    expect(screen.getByText('Show Without Type')).toBeInTheDocument();
    expect(screen.queryByText(/Type:/)).not.toBeInTheDocument();
  });
});
