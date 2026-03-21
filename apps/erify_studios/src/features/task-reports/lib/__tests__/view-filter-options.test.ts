import { describe, expect, it } from 'vitest';

import { buildViewFilterOptions } from '../view-filter-options';

describe('buildViewFilterOptions', () => {
  it('uses stable ids as values while showing display labels', () => {
    const rows = [
      { client_id: 'client_1', client_name: 'Client A' },
      { client_id: 'client_2', client_name: 'Client B' },
    ];

    const options = buildViewFilterOptions(
      rows,
      (row) => [row.client_name],
      (row) => [row.client_id],
    );

    expect(options).toEqual([
      { value: 'client_1', label: 'Client A' },
      { value: 'client_2', label: 'Client B' },
    ]);
  });

  it('keeps duplicate display labels distinct when ids differ', () => {
    const rows = [
      { client_id: 'client_1', client_name: 'Acme' },
      { client_id: 'client_2', client_name: 'Acme' },
    ];

    const options = buildViewFilterOptions(
      rows,
      (row) => [row.client_name],
      (row) => [row.client_id],
    );

    expect(options).toEqual([
      { value: 'client_1', label: 'Acme' },
      { value: 'client_2', label: 'Acme' },
    ]);
  });

  it('falls back to names when no stable ids exist', () => {
    const rows = [
      { show_status_name: 'Confirmed' },
      { show_status_name: 'Pending' },
    ];

    const options = buildViewFilterOptions(
      rows,
      (row) => [row.show_status_name],
      (row) => [row.show_status_id],
    );

    expect(options).toEqual([
      { value: 'Confirmed', label: 'Confirmed' },
      { value: 'Pending', label: 'Pending' },
    ]);
  });

  it('pairs assignee ids with assignee names for multi-assignee rows', () => {
    const rows = [
      { assignee_ids: ['user_1', 'user_2'], assignee_names: ['Alice', 'Bob'] },
    ];

    const options = buildViewFilterOptions(
      rows,
      (row) => [row.assignee_names, row.assignee_name, row.assignee],
      (row) => [row.assignee_ids, row.assignee_id],
    );

    expect(options).toEqual([
      { value: 'user_1', label: 'Alice' },
      { value: 'user_2', label: 'Bob' },
    ]);
  });
});
