import { HttpError } from '@/lib/errors/http-error.util';
import { StudioShowMcOrchestrationService } from '@/studios/studio-show/studio-show-mc.orchestration.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

describe('studioShowMcOrchestrationService', () => {
  let service: StudioShowMcOrchestrationService;
  let showService: { findMany: jest.Mock };
  let mcRepository: { findByUids: jest.Mock };
  let studioMcRepository: { findMany: jest.Mock };
  let showMcRepository: {
    findMany: jest.Mock;
    createAssignment: jest.Mock;
    restoreAndUpdateAssignment: jest.Mock;
    softDeleteByMcIds: jest.Mock;
  };
  let showMcService: { generateShowMcUid: jest.Mock };

  beforeEach(() => {
    showService = { findMany: jest.fn() };
    mcRepository = { findByUids: jest.fn() };
    studioMcRepository = { findMany: jest.fn() };
    showMcRepository = {
      findMany: jest.fn(),
      createAssignment: jest.fn(),
      restoreAndUpdateAssignment: jest.fn(),
      softDeleteByMcIds: jest.fn(),
    };
    showMcService = { generateShowMcUid: jest.fn().mockReturnValue('show_mc_new') };

    service = new StudioShowMcOrchestrationService(
      showService as never,
      mcRepository as never,
      studioMcRepository as never,
      showMcRepository as never,
      showMcService as never,
    );
  });

  it('creates missing assignments, restores deleted ones, and skips active ones', async () => {
    showService.findMany.mockResolvedValue([
      { id: BigInt(1), uid: 'show_1' },
    ]);
    mcRepository.findByUids.mockResolvedValue([
      { id: BigInt(10), uid: 'mc_1' },
      { id: BigInt(11), uid: 'mc_2' },
      { id: BigInt(12), uid: 'mc_3' },
    ]);
    studioMcRepository.findMany.mockResolvedValue([
      { mcId: BigInt(10) },
      { mcId: BigInt(11) },
      { mcId: BigInt(12) },
    ]);
    showMcRepository.findMany.mockResolvedValue([
      { id: BigInt(100), showId: BigInt(1), mcId: BigInt(10), deletedAt: null },
      { id: BigInt(101), showId: BigInt(1), mcId: BigInt(11), deletedAt: new Date() },
    ]);
    showMcRepository.createAssignment.mockResolvedValue({ id: BigInt(102) });
    showMcRepository.restoreAndUpdateAssignment.mockResolvedValue({ id: BigInt(101) });

    const result = await service.bulkAppendCreatorsToShows(
      'std_1',
      ['show_1'],
      ['mc_1', 'mc_2', 'mc_3'],
    );

    expect(result).toEqual({
      created: 2,
      skipped: 1,
      removed: 0,
      errors: [],
    });
    expect(showMcRepository.restoreAndUpdateAssignment).toHaveBeenCalledWith(BigInt(101), {});
    expect(showMcRepository.createAssignment).toHaveBeenCalledTimes(1);
    expect(showMcRepository.createAssignment).toHaveBeenCalledWith({
      uid: 'show_mc_new',
      showId: BigInt(1),
      mcId: BigInt(12),
    });
  });

  it('throws bad request when at least one show is missing or out of studio', async () => {
    showService.findMany.mockResolvedValue([{ id: BigInt(1), uid: 'show_1' }]);

    await expect(
      service.bulkAppendCreatorsToShows('std_1', ['show_1', 'show_2'], ['mc_1']),
    ).rejects.toMatchObject(HttpError.badRequest('Shows not found or not in this studio: show_2'));
  });

  it('throws bad request when at least one creator is missing', async () => {
    showService.findMany.mockResolvedValue([{ id: BigInt(1), uid: 'show_1' }]);
    mcRepository.findByUids.mockResolvedValue([{ id: BigInt(10), uid: 'mc_1' }]);

    await expect(
      service.bulkAppendCreatorsToShows('std_1', ['show_1'], ['mc_1', 'mc_2']),
    ).rejects.toMatchObject(HttpError.badRequest('Creators not found: mc_2'));
  });

  it('throws bad request when at least one creator is not in active studio roster', async () => {
    showService.findMany.mockResolvedValue([{ id: BigInt(1), uid: 'show_1' }]);
    mcRepository.findByUids.mockResolvedValue([
      { id: BigInt(10), uid: 'mc_1' },
      { id: BigInt(11), uid: 'mc_2' },
    ]);
    studioMcRepository.findMany.mockResolvedValue([
      { mcId: BigInt(10) },
    ]);

    await expect(
      service.bulkAppendCreatorsToShows('std_1', ['show_1'], ['mc_1', 'mc_2']),
    ).rejects.toMatchObject(
      HttpError.badRequest('Creators are not active in this studio roster: mc_2'),
    );
  });

  it('accepts duplicate show and MC UIDs by de-duplicating before validation', async () => {
    showService.findMany.mockResolvedValue([{ id: BigInt(1), uid: 'show_1' }]);
    mcRepository.findByUids.mockResolvedValue([{ id: BigInt(10), uid: 'mc_1' }]);
    studioMcRepository.findMany.mockResolvedValue([{ mcId: BigInt(10) }]);
    showMcRepository.findMany.mockResolvedValue([]);
    showMcRepository.createAssignment.mockResolvedValue({ id: BigInt(100) });

    const result = await service.bulkAppendCreatorsToShows(
      'std_1',
      ['show_1', 'show_1'],
      ['mc_1', 'mc_1'],
    );

    expect(result).toEqual({
      created: 1,
      skipped: 0,
      removed: 0,
      errors: [],
    });
    expect(showService.findMany).toHaveBeenCalledWith({
      where: {
        uid: { in: ['show_1'] },
        studio: { uid: 'std_1' },
        deletedAt: null,
      },
    });
    expect(mcRepository.findByUids).toHaveBeenCalledWith(['mc_1']);
  });

  it('collects per-pair errors instead of throwing', async () => {
    showService.findMany.mockResolvedValue([{ id: BigInt(1), uid: 'show_1' }]);
    mcRepository.findByUids.mockResolvedValue([{ id: BigInt(10), uid: 'mc_1' }]);
    studioMcRepository.findMany.mockResolvedValue([{ mcId: BigInt(10) }]);
    showMcRepository.findMany.mockResolvedValue([]);
    showMcRepository.createAssignment.mockRejectedValue(new Error('insert failed'));

    const result = await service.bulkAppendCreatorsToShows('std_1', ['show_1'], ['mc_1']);

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.errors).toEqual([
      { show_id: 'show_1', creator_id: 'mc_1', reason: 'insert failed' },
    ]);
  });

  it('replaces show MC assignments by removing non-target MCs and creating/restoring target ones', async () => {
    showService.findMany.mockResolvedValue([{ id: BigInt(1), uid: 'show_1' }]);
    mcRepository.findByUids.mockResolvedValue([
      { id: BigInt(10), uid: 'mc_1' },
      { id: BigInt(11), uid: 'mc_2' },
    ]);
    studioMcRepository.findMany.mockResolvedValue([
      { mcId: BigInt(10) },
      { mcId: BigInt(11) },
    ]);
    showMcRepository.findMany.mockResolvedValue([
      { id: BigInt(100), showId: BigInt(1), mcId: BigInt(12), deletedAt: null }, // remove
      { id: BigInt(101), showId: BigInt(1), mcId: BigInt(10), deletedAt: null }, // keep
      { id: BigInt(102), showId: BigInt(1), mcId: BigInt(11), deletedAt: new Date() }, // restore
    ]);
    showMcRepository.softDeleteByMcIds.mockResolvedValue(undefined);
    showMcRepository.restoreAndUpdateAssignment.mockResolvedValue({ id: BigInt(102) });

    const result = await service.bulkReplaceCreatorsToShows(
      'std_1',
      ['show_1'],
      ['mc_1', 'mc_2'],
    );

    expect(showMcRepository.softDeleteByMcIds).toHaveBeenCalledWith(
      BigInt(1),
      [BigInt(12)],
    );
    expect(showMcRepository.restoreAndUpdateAssignment).toHaveBeenCalledWith(BigInt(102), {});
    expect(result).toEqual({
      created: 1,
      skipped: 1,
      removed: 1,
      errors: [],
    });
  });
});
