import { describe, expect, it, vi } from 'vitest';

import { checkAssigneeShiftCoverageInShowWindow } from '../task-assignment-shift-coverage';

import { getStudioShifts } from '@/features/studio-shifts/api/get-studio-shifts';

vi.mock('@/features/studio-shifts/api/get-studio-shifts', () => ({
  getStudioShifts: vi.fn(),
}));

describe('checkAssigneeShiftCoverageInShowWindow', () => {
  it('returns covered for invalid show window timestamps without querying shifts', async () => {
    const result = await checkAssigneeShiftCoverageInShowWindow('studio_1', 'usr_1', {
      name: 'Show A',
      start_time: 'invalid-start',
      end_time: 'invalid-end',
    });

    expect(result).toEqual({
      hasCoverage: true,
      showStart: null,
    });
    expect(getStudioShifts).not.toHaveBeenCalled();
  });

  it('returns false when no overlapping shift exists', async () => {
    vi.mocked(getStudioShifts).mockResolvedValueOnce({
      data: [],
      meta: {
        page: 1,
        limit: 200,
        total: 0,
        totalPages: 1,
      },
    });

    const result = await checkAssigneeShiftCoverageInShowWindow('studio_1', 'usr_1', {
      name: 'Show A',
      start_time: '2026-03-05T10:00:00.000Z',
      end_time: '2026-03-05T12:00:00.000Z',
    });

    expect(result.hasCoverage).toBe(false);
    expect(result.showStart?.toISOString()).toBe('2026-03-05T10:00:00.000Z');
    expect(getStudioShifts).toHaveBeenCalledWith(
      'studio_1',
      expect.objectContaining({
        page: 1,
        limit: 200,
        user_id: 'usr_1',
      }),
    );
  });

  it('returns true when overlapping shift exists', async () => {
    vi.mocked(getStudioShifts).mockResolvedValueOnce({
      data: [
        {
          id: 'shift_1',
          blocks: [
            {
              id: 'block_1',
              start_time: '2026-03-05T10:30:00.000Z',
              end_time: '2026-03-05T11:30:00.000Z',
            },
          ],
          status: 'SCHEDULED',
        },
      ] as never[],
      meta: {
        page: 1,
        limit: 200,
        total: 1,
        totalPages: 1,
      },
    });

    const result = await checkAssigneeShiftCoverageInShowWindow('studio_1', 'usr_1', {
      name: 'Show A',
      start_time: '2026-03-05T10:00:00.000Z',
      end_time: '2026-03-05T12:00:00.000Z',
    });

    expect(result.hasCoverage).toBe(true);
  });
});
