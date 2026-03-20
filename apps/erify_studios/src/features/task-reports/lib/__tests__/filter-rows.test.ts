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

  it('filters status by show_status_name values', () => {
    const rows = [
      { show_name: 'Show A', show_status_name: 'Confirmed' },
      { show_name: 'Show B', show_status_name: 'Pending' },
    ];

    const filtered = filterRows(rows, columns, { show_status_id: 'Confirmed' });

    expect(filtered).toEqual([{ show_name: 'Show A', show_status_name: 'Confirmed' }]);
  });

  it('supports fallback id-based keys for backward compatibility', () => {
    const rows = [
      { show_name: 'Show A', client_id: 'client_1', studio_room_id: 'room_1', show_status_id: 'status_1' },
      { show_name: 'Show B', client_id: 'client_2', studio_room_id: 'room_2', show_status_id: 'status_2' },
    ];

    const filtered = filterRows(rows, columns, { client_id: 'client_2', studio_room_id: 'room_2', show_status_id: 'status_2' });

    expect(filtered).toEqual([{ show_name: 'Show B', client_id: 'client_2', studio_room_id: 'room_2', show_status_id: 'status_2' }]);
  });

  it('filters assignee using display name when available', () => {
    const rows = [
      { show_name: 'Show A', assignee_name: 'Alice' },
      { show_name: 'Show B', assignee_name: 'Bob' },
    ];

    const filtered = filterRows(rows, columns, { assignee: 'Bob' });

    expect(filtered).toEqual([{ show_name: 'Show B', assignee_name: 'Bob' }]);
  });
});
