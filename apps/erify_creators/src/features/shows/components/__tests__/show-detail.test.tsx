import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Show } from '../../types';
import { ShowDetailView } from '../show-detail';

// Mock the router Link component
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

const mockShow: Show = {
  id: '1',
  name: 'Test Show',
  client_id: 'cli_123',
  client_name: 'Test Client',
  studio_room_id: 'str_456',
  studio_room_name: 'Studio A',
  show_type_id: 'sty_789',
  show_type_name: 'Live',
  show_status_id: 'sts_101',
  show_status_name: 'Active',
  show_standard_id: 'std_202',
  show_standard_name: 'HD',
  start_time: '2024-01-01T10:00:00Z',
  end_time: '2024-01-01T12:00:00Z',
  metadata: { key1: 'value1', key2: 'value2' },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('showDetailView', () => {
  it('renders show name', () => {
    render(<ShowDetailView show={mockShow} />);

    // Show name appears twice: once in breadcrumb, once as title
    const showNames = screen.getAllByText('Test Show');
    expect(showNames).toHaveLength(2);
  });

  it('renders breadcrumb navigation', () => {
    render(<ShowDetailView show={mockShow} />);

    expect(screen.getByText('Shows')).toBeInTheDocument();
    // The breadcrumb page should show the show name
    expect(screen.getAllByText('Test Show')).toHaveLength(2); // Once in breadcrumb, once in title
  });

  it('renders show id', () => {
    render(<ShowDetailView show={mockShow} />);

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders show type when available', () => {
    render(<ShowDetailView show={mockShow} />);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders show status when available', () => {
    render(<ShowDetailView show={mockShow} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders show standard when available', () => {
    render(<ShowDetailView show={mockShow} />);

    expect(screen.getByText('HD')).toBeInTheDocument();
  });

  it('renders client name when available', () => {
    render(<ShowDetailView show={mockShow} />);

    expect(screen.getByText('Test Client')).toBeInTheDocument();
  });

  it('renders studio room name when available', () => {
    render(<ShowDetailView show={mockShow} />);

    expect(screen.getByText('Studio A')).toBeInTheDocument();
  });

  it('renders start and end time with proper formatting', () => {
    render(<ShowDetailView show={mockShow} />);

    const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const startTime = dateTimeFormatter.format(new Date(mockShow.start_time!));
    const endTime = dateTimeFormatter.format(new Date(mockShow.end_time!));

    expect(screen.getByText(startTime)).toBeInTheDocument();
    expect(screen.getByText(endTime)).toBeInTheDocument();
  });

  it('renders metadata when available', () => {
    render(<ShowDetailView show={mockShow} />);

    expect(screen.getByText('key1')).toBeInTheDocument();
    expect(screen.getByText('value1')).toBeInTheDocument();
    expect(screen.getByText('key2')).toBeInTheDocument();
    expect(screen.getByText('value2')).toBeInTheDocument();
  });

  it('renders created and updated dates', () => {
    render(<ShowDetailView show={mockShow} />);

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
    });
    const createdAt = dateFormatter.format(new Date(mockShow.created_at));
    const updatedAt = dateFormatter.format(new Date(mockShow.updated_at));

    // Dates appear in the system information section
    expect(screen.getAllByText(createdAt).length).toBeGreaterThan(0);
    expect(screen.getAllByText(updatedAt).length).toBeGreaterThan(0);
  });

  it('does not render optional fields when not available', () => {
    const showWithoutOptional: Show = {
      id: '2',
      name: 'Minimal Show',
      client_id: null,
      client_name: null,
      studio_room_id: null,
      studio_room_name: null,
      show_type_id: null,
      show_type_name: null,
      show_status_id: null,
      show_status_name: null,
      show_standard_id: null,
      show_standard_name: null,
      start_time: '2024-01-01T10:00:00Z',
      end_time: '2024-01-01T12:00:00Z',
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    render(<ShowDetailView show={showWithoutOptional} />);

    // Show name appears twice: once in breadcrumb, once as title
    const showNames = screen.getAllByText('Minimal Show');
    expect(showNames).toHaveLength(2);
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByText('HD')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Client')).not.toBeInTheDocument();
    expect(screen.queryByText('Studio A')).not.toBeInTheDocument();
  });

  it('does not render metadata section when metadata is empty', () => {
    const showWithoutMetadata: Show = {
      ...mockShow,
      metadata: {},
    };

    render(<ShowDetailView show={showWithoutMetadata} />);

    expect(screen.queryByText('Metadata')).not.toBeInTheDocument();
  });
});
