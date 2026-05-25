import type { ShowPlatformViolationRepository } from './show-platform-violation.repository';
import { ShowPlatformViolationService } from './show-platform-violation.service';

import type { UtilityService } from '@/utility/utility.service';

function buildRepository(): jest.Mocked<ShowPlatformViolationRepository> {
  return {
    findActiveByTaskField: jest.fn().mockResolvedValue([
      { uid: 'spv_old', violationType: 'COPYRIGHT', severity: 'WARNING' },
    ]),
    supersedeActiveByTaskField: jest.fn().mockResolvedValue({ count: 1 }),
    createMany: jest.fn().mockResolvedValue({ count: 1 }),
  } as unknown as jest.Mocked<ShowPlatformViolationRepository>;
}

function buildUtility(): jest.Mocked<UtilityService> {
  return {
    generateBrandedId: jest
      .fn()
      .mockReturnValueOnce('spv_new')
      .mockReturnValueOnce('spv_next'),
  } as unknown as jest.Mocked<UtilityService>;
}

describe('showPlatformViolationService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-23T18:30:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('supersedes only active rows for the same show platform, source task, and hydrated field', async () => {
    const repository = buildRepository();
    const service = new ShowPlatformViolationService(repository, buildUtility());

    const result = await service.replaceForTaskField({
      showPlatformId: 200n,
      sourceTaskId: 99n,
      sourceFieldId: 'fld_violate123:platform:show_plt_200',
      entries: [
        {
          violationType: 'COPYRIGHT',
          severity: 'WARNING',
          reason: 'Copyright warning from platform',
          observedAt: new Date('2026-05-23T18:30:00.000Z'),
          metadata: { task_uid: 'task_alpha' },
        },
      ],
    });

    const scope = {
      showPlatformId: 200n,
      sourceTaskId: 99n,
      sourceFieldId: 'fld_violate123:platform:show_plt_200',
    };
    expect(repository.findActiveByTaskField).toHaveBeenCalledWith(scope);
    expect(repository.supersedeActiveByTaskField).toHaveBeenCalledWith(
      scope,
      new Date('2026-05-23T18:30:00.000Z'),
    );
    expect(repository.createMany).toHaveBeenCalledWith([
      {
        uid: 'spv_new',
        showPlatformId: 200n,
        violationType: 'COPYRIGHT',
        severity: 'WARNING',
        reason: 'Copyright warning from platform',
        observedAt: new Date('2026-05-23T18:30:00.000Z'),
        sourceTaskId: 99n,
        sourceFieldId: 'fld_violate123:platform:show_plt_200',
        metadata: { task_uid: 'task_alpha' },
      },
    ]);
    expect(result).toEqual({
      created: [
        {
          uid: 'spv_new',
          violationType: 'COPYRIGHT',
          severity: 'WARNING',
        },
      ],
      superseded: [
        {
          uid: 'spv_old',
          violationType: 'COPYRIGHT',
          severity: 'WARNING',
        },
      ],
    });
  });

  it('clears scoped rows without creating replacements when entries is empty', async () => {
    const repository = buildRepository();
    const service = new ShowPlatformViolationService(repository, buildUtility());

    const result = await service.replaceForTaskField({
      showPlatformId: 200n,
      sourceTaskId: 99n,
      sourceFieldId: 'fld_violate123:platform:show_plt_200',
      entries: [],
    });

    expect(repository.supersedeActiveByTaskField).toHaveBeenCalledTimes(1);
    expect(repository.createMany).not.toHaveBeenCalled();
    expect(result.created).toEqual([]);
    expect(result.superseded).toEqual([
      {
        uid: 'spv_old',
        violationType: 'COPYRIGHT',
        severity: 'WARNING',
      },
    ]);
  });
});
