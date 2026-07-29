import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SceneQcRecordsView } from '../scene-qc-records-view';

const mockUseSceneQcRecords = vi.fn();

vi.mock('../../hooks/use-scene-qc-records', () => ({
  useSceneQcRecords: (...args: unknown[]) => mockUseSceneQcRecords(...args),
}));
vi.mock('../scene-qc-records-filters', () => ({
  SceneQcRecordsFilters: () => <div data-testid="records-filters" />,
}));
vi.mock('../scene-qc-record-detail-sheet', () => ({
  SceneQcRecordDetailSheet: ({ open, isLoading }: { open: boolean; isLoading: boolean }) => (
    <div data-testid="detail-sheet" data-open={open} data-loading={isLoading} />
  ),
}));

function buildRecord(overrides: Record<string, unknown> = {}) {
  return {
    review_id: 'scqcr_1',
    operational_date: '2026-06-01',
    show_id: 'show_1',
    show_name: 'Show One',
    scheduled_start_time: '2026-06-01T07:00:00.000Z',
    client: { id: 'client_1', name: 'Client One' },
    platforms: [{ id: 'plt_1', name: 'TikTok' }],
    result: 'PASS',
    has_feedback: false,
    reviewed_by: { id: 'user_1', name: 'Reviewer' },
    reviewed_at: '2026-06-01T07:30:00.000Z',
    version: 1,
    evidence_count: 1,
    confirmation_status: 'CONFIRMED',
    confirmation_id: 'scqcc_1',
    confirmation_revision: 1,
    ...overrides,
  };
}

const BASE_SEARCH = { tab: 'records' as const, review_state: 'all' as const, page: 1, limit: 20 };

describe('sceneQcRecordsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSceneQcRecords.mockReturnValue({
      dateFrom: '2026-06-01',
      dateTo: '2026-06-07',
      recordsQuery: { data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }, isLoading: false, isFetching: false },
      detailQuery: { data: undefined, isLoading: false, isError: false },
      selectedRecordId: undefined,
      selectRecord: vi.fn(),
      closeDetail: vi.fn(),
      changeScope: vi.fn(),
      changePage: vi.fn(),
    });
  });

  it('renders a filtered/empty state when there are no records for the range', () => {
    render(<SceneQcRecordsView studioId="studio_abc" search={BASE_SEARCH} onSearchChange={vi.fn()} onOpenReport={vi.fn()} />);

    expect(screen.getByText(/No Scene QC records for this range/i)).toBeInTheDocument();
  });

  it('renders loading state via the table', () => {
    mockUseSceneQcRecords.mockReturnValue({
      dateFrom: '2026-06-01',
      dateTo: '2026-06-07',
      recordsQuery: { data: undefined, isLoading: true, isFetching: true },
      detailQuery: { data: undefined, isLoading: false, isError: false },
      selectedRecordId: undefined,
      selectRecord: vi.fn(),
      closeDetail: vi.fn(),
      changeScope: vi.fn(),
      changePage: vi.fn(),
    });

    render(<SceneQcRecordsView studioId="studio_abc" search={BASE_SEARCH} onSearchChange={vi.fn()} onOpenReport={vi.fn()} />);
    expect(document.querySelector('table')).toBeInTheDocument();
  });

  it('the detail sheet is closed and detail lazily disabled until a record is selected', () => {
    render(<SceneQcRecordsView studioId="studio_abc" search={BASE_SEARCH} onSearchChange={vi.fn()} onOpenReport={vi.fn()} />);

    const detailSheet = screen.getByTestId('detail-sheet');
    expect(detailSheet).toHaveAttribute('data-open', 'false');
  });

  it('the detail sheet opens once a record is selected', () => {
    mockUseSceneQcRecords.mockReturnValue({
      dateFrom: '2026-06-01',
      dateTo: '2026-06-07',
      recordsQuery: { data: { data: [buildRecord()], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }, isLoading: false, isFetching: false },
      detailQuery: { data: undefined, isLoading: true, isError: false },
      selectedRecordId: 'scqcr_1',
      selectRecord: vi.fn(),
      closeDetail: vi.fn(),
      changeScope: vi.fn(),
      changePage: vi.fn(),
    });

    render(<SceneQcRecordsView studioId="studio_abc" search={BASE_SEARCH} onSearchChange={vi.fn()} onOpenReport={vi.fn()} />);

    const detailSheet = screen.getByTestId('detail-sheet');
    expect(detailSheet).toHaveAttribute('data-open', 'true');
    expect(detailSheet).toHaveAttribute('data-loading', 'true');
  });

  it('server-paginated: row data comes directly from the query response, not client-side pagination', () => {
    mockUseSceneQcRecords.mockReturnValue({
      dateFrom: '2026-06-01',
      dateTo: '2026-06-07',
      recordsQuery: { data: { data: [buildRecord()], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }, isLoading: false, isFetching: false },
      detailQuery: { data: undefined, isLoading: false, isError: false },
      selectedRecordId: undefined,
      selectRecord: vi.fn(),
      closeDetail: vi.fn(),
      changeScope: vi.fn(),
      changePage: vi.fn(),
    });

    render(<SceneQcRecordsView studioId="studio_abc" search={BASE_SEARCH} onSearchChange={vi.fn()} onOpenReport={vi.fn()} />);
    expect(screen.getByText('Show One')).toBeInTheDocument();
  });
});
