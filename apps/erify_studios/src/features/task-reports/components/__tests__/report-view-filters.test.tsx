import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReportViewFilters } from '../report-view-filters';

const clientOptions = [{ value: 'client_1', label: 'Client A' }];
const statusOptions = [{ value: 'status_confirmed', label: 'Completed' }];
const roomOptions = [{ value: 'room_1', label: 'Room A' }];
const assigneeOptions = [{ value: 'user_1', label: 'Manager A' }];

describe('reportViewFilters', () => {
  it('hides status and room filters when disabled by renderer context', () => {
    render(
      <ReportViewFilters
        filters={{}}
        onChange={vi.fn()}
        availableClients={clientOptions}
        availableStatuses={statusOptions}
        availableRooms={roomOptions}
        availableAssignees={assigneeOptions}
        showStatusFilter={false}
        showRoomFilter={false}
        showAssigneeFilter={false}
        showClientFilter
      />,
    );

    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Room')).not.toBeInTheDocument();
  });

  it('renders all contextual filters when enabled and options exist', () => {
    render(
      <ReportViewFilters
        filters={{}}
        onChange={vi.fn()}
        availableClients={clientOptions}
        availableStatuses={statusOptions}
        availableRooms={roomOptions}
        availableAssignees={assigneeOptions}
        showStatusFilter
        showRoomFilter
        showAssigneeFilter
        showClientFilter
      />,
    );

    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Room')).toBeInTheDocument();
  });
});
