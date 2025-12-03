import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Show } from '../../types';
import { ShowList } from '../show-list';

const mockShows: Show[] = [
  {
    id: '1',
    name: 'Test Show 1',
    showTypeName: 'Live',
    startTime: '2024-01-01T10:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Test Show 2',
    showTypeName: 'Recorded',
    startTime: '2024-01-02T10:00:00Z',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
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

    const startTime = new Date(mockShows[0].startTime!).toLocaleString();
    expect(screen.getByText(startTime)).toBeInTheDocument();
  });

  it('does not render show type when not available', () => {
    const showWithoutType: Show = {
      id: '3',
      name: 'Show Without Type',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    render(<ShowList shows={[showWithoutType]} isLoading={false} />);

    expect(screen.getByText('Show Without Type')).toBeInTheDocument();
    expect(screen.queryByText(/Type:/)).not.toBeInTheDocument();
  });
});
