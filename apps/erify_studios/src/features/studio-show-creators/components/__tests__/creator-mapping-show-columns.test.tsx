import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { creatorMappingShowColumns } from '../creator-mapping-show-columns';

import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';

const baseShow = {
  id: 'show_1',
  name: 'Night Session',
  client_id: 'client_1',
  client_name: 'Client A',
  studio_id: 'std_1',
  studio_name: 'Studio 1',
  studio_room_id: 'room_1',
  studio_room_name: 'Room 1',
  show_type_id: 'type_1',
  show_type_name: 'Live',
  show_status_id: 'status_1',
  show_status_name: 'LIVE',
  show_status_system_key: 'LIVE',
  show_standard_id: 'standard_1',
  show_standard_name: 'Standard',
  start_time: '2026-03-15T10:00:00.000Z',
  end_time: '2026-03-15T12:00:00.000Z',
  metadata: {},
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  creators: [{ creator_id: 'creator_1', creator_name: 'Alice', creator_alias_name: 'Ali' }],
  task_summary: {
    total: 0,
    assigned: 0,
    unassigned: 0,
    completed: 0,
  },
} satisfies StudioShow;

describe('creatorMappingShowColumns', () => {
  it('removes row action column and keeps status as a dedicated column', () => {
    expect(creatorMappingShowColumns.some((column) => column.id === 'actions')).toBe(false);
    expect(creatorMappingShowColumns.some((column: any) => column.accessorKey === 'show_status_name')).toBe(true);
  });

  it('renders status badge in status column cell', () => {
    const statusColumn = creatorMappingShowColumns.find((column: any) => column.accessorKey === 'show_status_name') as any;

    const StatusCell = statusColumn.cell;
    render(StatusCell({ row: { original: baseShow } }));

    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('provides hidden creator-mapping filter support columns', () => {
    const creatorNameColumn = creatorMappingShowColumns.find((column) => column.id === 'creator_name') as any;
    const hasCreatorsColumn = creatorMappingShowColumns.find((column) => column.id === 'has_creators') as any;

    expect(creatorNameColumn?.meta?.className).toBe('hidden');
    expect(hasCreatorsColumn?.meta?.className).toBe('hidden');
  });
});
