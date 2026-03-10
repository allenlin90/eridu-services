import { HttpError } from '@/lib/errors/http-error.util';
import { StudioShowCreatorOrchestrationService } from '@/studios/studio-show/studio-show-creator.orchestration.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

describe('studioShowCreatorOrchestrationService', () => {
  let service: StudioShowCreatorOrchestrationService;
  let showService: { findMany: jest.Mock };
  let creatorRepository: { findByUids: jest.Mock };
  let studioCreatorRepository: { findMany: jest.Mock };
  let showCreatorRepository: {
    findMany: jest.Mock;
    createAssignment: jest.Mock;
    restoreAndUpdateAssignment: jest.Mock;
    softDeleteByCreatorIds: jest.Mock;
  };
  let showCreatorService: { generateShowCreatorUid: jest.Mock };

  beforeEach(() => {
    showService = { findMany: jest.fn() };
    creatorRepository = { findByUids: jest.fn() };
    studioCreatorRepository = { findMany: jest.fn() };
    showCreatorRepository = {
      findMany: jest.fn(),
      createAssignment: jest.fn(),
      restoreAndUpdateAssignment: jest.fn(),
      softDeleteByCreatorIds: jest.fn(),
    };
    showCreatorService = { generateShowCreatorUid: jest.fn().mockReturnValue('show_creator_new') };

    service = new StudioShowCreatorOrchestrationService(
      showService as never,
      creatorRepository as never,
      studioCreatorRepository as never,
      showCreatorRepository as never,
      showCreatorService as never,
    );
  });

  it('creates missing assignments, restores deleted ones, and skips active ones', async () => {
    showService.findMany.mockResolvedValue([
      { id: BigInt(1), uid: 'show_1' },
    ]);
    creatorRepository.findByUids.mockResolvedValue([
      { id: BigInt(10), uid: 'creator_1' },
      { id: BigInt(11), uid: 'creator_2' },
      { id: BigInt(12), uid: 'creator_3' },
    ]);
    studioCreatorRepository.findMany.mockResolvedValue([
      { mcId: BigInt(10) },
      { mcId: BigInt(11) },
      { mcId: BigInt(12) },
    ]);
    showCreatorRepository.findMany.mockResolvedValue([
      { id: BigInt(100), showId: BigInt(1), mcId: BigInt(10), deletedAt: null },
      { id: BigInt(101), showId: BigInt(1), mcId: BigInt(11), deletedAt: new Date() },
    ]);
    showCreatorRepository.createAssignment.mockResolvedValue({ id: BigInt(102) });
    showCreatorRepository.restoreAndUpdateAssignment.mockResolvedValue({ id: BigInt(101) });

    const result = await service.bulkAppendCreatorsToShows(
      'std_1',
      ['show_1'],
      ['creator_1', 'creator_2', 'creator_3'],
    );

    expect(result).toEqual({
      created: 2,
      skipped: 1,
      removed: 0,
      errors: [],
    });
    expect(showCreatorRepository.restoreAndUpdateAssignment).toHaveBeenCalledWith(BigInt(101), {});
    expect(showCreatorRepository.createAssignment).toHaveBeenCalledTimes(1);
    expect(showCreatorRepository.createAssignment).toHaveBeenCalledWith({
      uid: 'show_creator_new',
      showId: BigInt(1),
      mcId: BigInt(12),
    });
  });

  it('throws bad request when at least one show is missing or out of studio', async () => {
    showService.findMany.mockResolvedValue([{ id: BigInt(1), uid: 'show_1' }]);

    await expect(
      service.bulkAppendCreatorsToShows('std_1', ['show_1', 'show_2'], ['creator_1']),
    ).rejects.toMatchObject(HttpError.badRequest('Shows not found or not in this studio: show_2'));
  });

  it('throws bad request when at least one creator is missing', async () => {
    showService.findMany.mockResolvedValue([{ id: BigInt(1), uid: 'show_1' }]);
    creatorRepository.findByUids.mockResolvedValue([{ id: BigInt(10), uid: 'creator_1' }]);

    await expect(
      service.bulkAppendCreatorsToShows('std_1', ['show_1'], ['creator_1', 'creator_2']),
    ).rejects.toMatchObject(HttpError.badRequest('Creators not found: creator_2'));
  });

  it('throws bad request when at least one creator is not in active studio roster', async () => {
    showService.findMany.mockResolvedValue([{ id: BigInt(1), uid: 'show_1' }]);
    creatorRepository.findByUids.mockResolvedValue([
      { id: BigInt(10), uid: 'creator_1' },
      { id: BigInt(11), uid: 'creator_2' },
    ]);
    studioCreatorRepository.findMany.mockResolvedValue([
      { mcId: BigInt(10) },
    ]);

    await expect(
      service.bulkAppendCreatorsToShows('std_1', ['show_1'], ['creator_1', 'creator_2']),
    ).rejects.toMatchObject(
      HttpError.badRequest('Creators are not active in this studio roster: creator_2'),
    );
  });

  it('accepts duplicate show and creator UIDs by de-duplicating before validation', async () => {
    showService.findMany.mockResolvedValue([{ id: BigInt(1), uid: 'show_1' }]);
    creatorRepository.findByUids.mockResolvedValue([{ id: BigInt(10), uid: 'creator_1' }]);
    studioCreatorRepository.findMany.mockResolvedValue([{ mcId: BigInt(10) }]);
    showCreatorRepository.findMany.mockResolvedValue([]);
    showCreatorRepository.createAssignment.mockResolvedValue({ id: BigInt(100) });

    const result = await service.bulkAppendCreatorsToShows(
      'std_1',
      ['show_1', 'show_1'],
      ['creator_1', 'creator_1'],
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
    expect(creatorRepository.findByUids).toHaveBeenCalledWith(['creator_1']);
  });

  it('collects per-pair errors instead of throwing', async () => {
    showService.findMany.mockResolvedValue([{ id: BigInt(1), uid: 'show_1' }]);
    creatorRepository.findByUids.mockResolvedValue([{ id: BigInt(10), uid: 'creator_1' }]);
    studioCreatorRepository.findMany.mockResolvedValue([{ mcId: BigInt(10) }]);
    showCreatorRepository.findMany.mockResolvedValue([]);
    showCreatorRepository.createAssignment.mockRejectedValue(new Error('insert failed'));

    const result = await service.bulkAppendCreatorsToShows('std_1', ['show_1'], ['creator_1']);

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.errors).toEqual([
      { show_id: 'show_1', creator_id: 'creator_1', reason: 'insert failed' },
    ]);
  });

  it('replaces show creator assignments by removing non-target creators and creating/restoring target ones', async () => {
    showService.findMany.mockResolvedValue([{ id: BigInt(1), uid: 'show_1' }]);
    creatorRepository.findByUids.mockResolvedValue([
      { id: BigInt(10), uid: 'creator_1' },
      { id: BigInt(11), uid: 'creator_2' },
    ]);
    studioCreatorRepository.findMany.mockResolvedValue([
      { mcId: BigInt(10) },
      { mcId: BigInt(11) },
    ]);
    showCreatorRepository.findMany.mockResolvedValue([
      { id: BigInt(100), showId: BigInt(1), mcId: BigInt(12), deletedAt: null }, // remove
      { id: BigInt(101), showId: BigInt(1), mcId: BigInt(10), deletedAt: null }, // keep
      { id: BigInt(102), showId: BigInt(1), mcId: BigInt(11), deletedAt: new Date() }, // restore
    ]);
    showCreatorRepository.softDeleteByCreatorIds.mockResolvedValue(undefined);
    showCreatorRepository.restoreAndUpdateAssignment.mockResolvedValue({ id: BigInt(102) });

    const result = await service.bulkReplaceCreatorsToShows(
      'std_1',
      ['show_1'],
      ['creator_1', 'creator_2'],
    );

    expect(showCreatorRepository.softDeleteByCreatorIds).toHaveBeenCalledWith(
      BigInt(1),
      [BigInt(12)],
    );
    expect(showCreatorRepository.restoreAndUpdateAssignment).toHaveBeenCalledWith(BigInt(102), {});
    expect(result).toEqual({
      created: 1,
      skipped: 1,
      removed: 1,
      errors: [],
    });
  });
});
