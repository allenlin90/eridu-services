import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ShowContextPanel } from '../show-context-panel';

import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';

function createShow(overrides: Partial<StudioShowDetail> = {}): StudioShowDetail {
  return {
    id: 'show_1',
    name: 'Night Session',
    client_id: 'client_1',
    client_name: 'Client A',
    schedule_id: null,
    schedule_name: null,
    studio_id: 'std_1',
    studio_name: 'Studio 1',
    studio_room_id: 'room_1',
    studio_room_name: 'Room 1',
    show_type_id: 'type_1',
    show_type_name: 'Live',
    show_status_id: 'status_1',
    show_status_name: 'Confirmed',
    show_status_system_key: 'CONFIRMED',
    show_standard_id: 'standard_1',
    show_standard_name: 'Standard',
    start_time: '2026-03-15T10:00:00.000Z',
    end_time: '2026-03-15T12:00:00.000Z',
    actual_start_time: '2026-03-15T10:15:00.000Z',
    actual_end_time: '2026-03-15T12:05:00.000Z',
    metadata: {},
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
    platforms: [
      { id: 'platform_1', name: 'YouTube' },
      { id: 'platform_2', name: 'TikTok' },
    ],
    ...overrides,
  };
}

describe('showContextPanel', () => {
  it('surfaces client, platform, timing, and show classification context', () => {
    render(<ShowContextPanel show={createShow()} />);

    expect(screen.getByText('Show context')).toBeInTheDocument();
    expect(screen.getByText('Client A')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByText('TikTok')).toBeInTheDocument();
    expect(screen.getByText('Studio 1')).toBeInTheDocument();
    expect(screen.getByText('Room 1')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('Show UID')).toBeInTheDocument();
    expect(screen.getByText('show_1')).toBeInTheDocument();
  });

  it('keeps missing platform and actuals states explicit', () => {
    render(
      <ShowContextPanel
        show={createShow({
          platforms: [],
          actual_start_time: null,
          actual_end_time: null,
        })}
      />,
    );

    expect(screen.getByText('No platform')).toBeInTheDocument();
    expect(screen.getByText('Not recorded')).toBeInTheDocument();
  });

  it('marks actuals partially recorded when only one timestamp exists', () => {
    render(
      <ShowContextPanel
        show={createShow({
          actual_start_time: '2026-03-15T10:15:00.000Z',
          actual_end_time: null,
        })}
      />,
    );

    expect(screen.getByText('Partially recorded')).toBeInTheDocument();
  });
});
