import { NotFoundException } from '@nestjs/common';

import type { ShowPlatformViolationRepository } from './show-platform-violation.repository';
import { ShowPlatformViolationService } from './show-platform-violation.service';

import type { UtilityService } from '@/utility/utility.service';

function buildRepository(overrides: {
  existing?: Array<{ uid: string; violationType: string; severity: string; reason?: string }>;
  existsActiveInShow?: boolean;
} = {}): jest.Mocked<ShowPlatformViolationRepository> {
  return {
    existsActiveInShow: jest.fn().mockResolvedValue(overrides.existsActiveInShow ?? true),
    findActiveByTaskField: jest.fn().mockResolvedValue(
      overrides.existing
      ?? [{ uid: 'spv_old', violationType: 'COPYRIGHT', severity: 'WARNING', reason: 'prior reason' }],
    ),
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
      showId: 10n,
      showPlatformId: 200n,
      sourceTaskId: 99n,
      sourceFieldId: 'fld_violate123:platform:show_plt_200',
      entries: [
        {
          violationType: 'DEFAMATION',
          severity: 'WARNING',
          reason: 'Defamation warning from platform',
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
        violationType: 'DEFAMATION',
        severity: 'WARNING',
        reason: 'Defamation warning from platform',
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
          violationType: 'DEFAMATION',
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
      showId: 10n,
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

  it('short-circuits without writing when the incoming set matches the stored set including reason', async () => {
    const repository = buildRepository({
      existing: [
        { uid: 'spv_a', violationType: 'COPYRIGHT', severity: 'WARNING', reason: 'same reason text' },
        { uid: 'spv_b', violationType: 'DEFAMATION', severity: 'WARNING', reason: 'same reason text' },
      ],
    });
    const service = new ShowPlatformViolationService(repository, buildUtility());

    const result = await service.replaceForTaskField({
      showId: 10n,
      showPlatformId: 200n,
      sourceTaskId: 99n,
      sourceFieldId: 'fld_violate123:platform:show_plt_200',
      entries: [
        {
          violationType: 'DEFAMATION',
          severity: 'WARNING',
          reason: 'same reason text',
          observedAt: new Date('2026-05-23T18:30:00.000Z'),
          metadata: {},
        },
        {
          violationType: 'COPYRIGHT',
          severity: 'WARNING',
          reason: 'same reason text',
          observedAt: new Date('2026-05-23T18:30:00.000Z'),
          metadata: {},
        },
      ],
    });

    expect(repository.supersedeActiveByTaskField).not.toHaveBeenCalled();
    expect(repository.createMany).not.toHaveBeenCalled();
    expect(result).toEqual({ created: [], superseded: [] });
  });

  it('rewrites rows when only the reason text changes', async () => {
    const repository = buildRepository({
      existing: [
        { uid: 'spv_a', violationType: 'COPYRIGHT', severity: 'WARNING', reason: 'original reason' },
      ],
    });
    const service = new ShowPlatformViolationService(repository, buildUtility());

    const result = await service.replaceForTaskField({
      showId: 10n,
      showPlatformId: 200n,
      sourceTaskId: 99n,
      sourceFieldId: 'fld_violate123:platform:show_plt_200',
      entries: [
        {
          violationType: 'COPYRIGHT',
          severity: 'WARNING',
          reason: 'corrected reason',
          observedAt: new Date('2026-05-23T18:30:00.000Z'),
          metadata: {},
        },
      ],
    });

    expect(repository.supersedeActiveByTaskField).toHaveBeenCalledTimes(1);
    expect(repository.createMany).toHaveBeenCalledTimes(1);
    expect(result.created).toHaveLength(1);
    expect(result.superseded).toEqual([
      { uid: 'spv_a', violationType: 'COPYRIGHT', severity: 'WARNING' },
    ]);
  });

  it('throws NotFoundException when the platform is no longer active under the show', async () => {
    const repository = buildRepository({ existsActiveInShow: false });
    const service = new ShowPlatformViolationService(repository, buildUtility());

    await expect(
      service.replaceForTaskField({
        showId: 10n,
        showPlatformId: 200n,
        sourceTaskId: 99n,
        sourceFieldId: 'fld_violate123:platform:show_plt_200',
        entries: [
          {
            violationType: 'COPYRIGHT',
            severity: 'WARNING',
            reason: 'r',
            observedAt: new Date(),
            metadata: {},
          },
        ],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(repository.findActiveByTaskField).not.toHaveBeenCalled();
    expect(repository.supersedeActiveByTaskField).not.toHaveBeenCalled();
    expect(repository.createMany).not.toHaveBeenCalled();
  });
});
