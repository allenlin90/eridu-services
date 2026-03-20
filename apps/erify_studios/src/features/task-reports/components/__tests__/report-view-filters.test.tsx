import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReportViewFilters } from '../report-view-filters';

describe('reportViewFilters', () => {
  it('hides status and room filters when disabled by renderer context', () => {
    render(
      <ReportViewFilters
        filters={{}}
        onChange={vi.fn()}
        availableClients={['Client A']}
        availableStatuses={['Completed']}
        availableRooms={['Room A']}
        availableAssignees={['Manager A']}
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
        availableClients={['Client A']}
        availableStatuses={['Completed']}
        availableRooms={['Room A']}
        availableAssignees={['Manager A']}
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
