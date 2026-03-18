import { describe, expect, it } from 'vitest';

import type { TaskReportSelectedColumn } from '@eridu/api-types/task-management';

import { filterRows } from '../filter-rows';

const columns: TaskReportSelectedColumn[] = [
  { key: 'show_name', label: 'Show' },
  { key: 'client_name', label: 'Client' },
  { key: 'studio_room_name', label: 'Room' },
];

describe('filterRows', () => {
  it('filters client by client_name values', () => {
    const rows = [
      { show_name: 'Show A', client_name: 'Client A', studio_room_name: 'Room 1' },
      { show_name: 'Show B', client_name: 'Client B', studio_room_name: 'Room 2' },
    ];

    const filtered = filterRows(rows, columns, { client_id: 'Client A' });

    expect(filtered).toEqual([{ show_name: 'Show A', client_name: 'Client A', studio_room_name: 'Room 1' }]);
  });

  it('filters room by studio_room_name values', () => {
    const rows = [
      { show_name: 'Show A', client_name: 'Client A', studio_room_name: 'Room 1' },
      { show_name: 'Show B', client_name: 'Client B', studio_room_name: 'Room 2' },
    ];

    const filtered = filterRows(rows, columns, { studio_room_id: 'Room 2' });

    expect(filtered).toEqual([{ show_name: 'Show B', client_name: 'Client B', studio_room_name: 'Room 2' }]);
  });

  it('supports fallback id-based keys for backward compatibility', () => {
    const rows = [
      { show_name: 'Show A', client_id: 'client_1', studio_room_id: 'room_1' },
      { show_name: 'Show B', client_id: 'client_2', studio_room_id: 'room_2' },
    ];

    const filtered = filterRows(rows, columns, { client_id: 'client_2', studio_room_id: 'room_2' });

    expect(filtered).toEqual([{ show_name: 'Show B', client_id: 'client_2', studio_room_id: 'room_2' }]);
  });
});
