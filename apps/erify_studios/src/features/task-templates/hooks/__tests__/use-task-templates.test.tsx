import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTaskTemplates } from '../use-task-templates';

const mockUseQuery = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: Symbol('keepPreviousData'),
  useQuery: (options: unknown) => mockUseQuery(options),
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

const mockUseTableUrlState = vi.fn();
vi.mock('@eridu/ui', () => ({
  useTableUrlState: (options: unknown) => mockUseTableUrlState(options),
}));

vi.mock('../../api/get-task-templates', () => ({
  getTaskTemplates: vi.fn(),
}));

describe('useTaskTemplates', () => {
  const defaultTableState = {
    pagination: { pageIndex: 0, pageSize: 10 },
    onPaginationChange: vi.fn(),
    setPageCount: vi.fn(),
    columnFilters: [],
    onColumnFiltersChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTableUrlState.mockReturnValue(defaultTableState);
    mockUseQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'ttpl_1',
            name: 'Moderation Template',
            description: 'Loop workflow',
            task_type: 'ACTIVE',
            is_active: true,
            version: 2,
            created_at: '2026-03-24T00:00:00.000Z',
            updated_at: '2026-03-25T00:00:00.000Z',
            current_schema: {
              items: [
                { id: 'f1', key: 'gmv_l1', type: 'number', label: 'GMV (Loop 1)', standard: true, group: 'l1' },
              ],
              metadata: {
                loops: [{ id: 'l1', name: 'Loop1', durationMin: 15 }],
              },
            },
          },
        ],
        meta: { total: 10, page: 1, limit: 10, totalPages: 2 },
      },
      isLoading: false,
      isFetching: false,
    });
  });

  it('maps API templates into moderation-aware table rows', () => {
    const { result } = renderHook(() => useTaskTemplates({ studioId: 'std_123' }));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0]).toMatchObject({
      id: 'ttpl_1',
      template_kind: 'moderation',
      loop_count: 1,
      shared_field_count: 1,
      field_count: 1,
    });
    expect(result.current.pagination).toMatchObject({
      pageIndex: 0,
      pageSize: 10,
      total: 10,
      pageCount: 2,
    });
  });

  it('includes all featured filters in the list query key', () => {
    mockUseTableUrlState.mockReturnValue({
      ...defaultTableState,
      columnFilters: [
        { id: 'name', value: 'moderation' },
        { id: 'template_kind', value: 'moderation' },
        { id: 'task_type', value: 'ACTIVE' },
        { id: 'is_active', value: 'true' },
      ],
    });

    renderHook(() => useTaskTemplates({ studioId: 'std_123' }));

    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: [
        'task-templates',
        'list',
        'std_123',
        {
          search: 'moderation',
          templateKind: 'moderation',
          taskType: 'ACTIVE',
          isActive: true,
          page: 1,
          limit: 10,
          sort: 'updated_at:desc',
        },
      ],
    }));
  });

  it('invalidates the studio task-template list prefix on refresh', () => {
    const { result } = renderHook(() => useTaskTemplates({ studioId: 'std_123' }));

    act(() => {
      result.current.handleRefresh();
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['task-templates', 'list', 'std_123'],
    });
  });
});
