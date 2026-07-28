import { Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { SceneQcAuditWriter } from './scene-qc-audit.writer';
import { SceneQcConfirmationRepository } from './scene-qc-confirmation.repository';
import { SceneQcConfirmationWorkflowService } from './scene-qc-confirmation-workflow.service';
import { SceneQcEvidenceResolver } from './scene-qc-evidence.resolver';
import { SceneQcRepository } from './scene-qc-review.repository';

import { UidGeneratorService } from '@/lib/uid/uid-generator.service';
import { UserService } from '@/models/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';

function buildShow(overrides: Partial<{ id: bigint; uid: string; name: string; platformUid: string }> = {}) {
  return {
    id: overrides.id ?? 1n,
    uid: overrides.uid ?? 'show_1',
    name: overrides.name ?? 'Show One',
    startTime: new Date('2026-08-01T07:00:00.000Z'),
    deletedAt: null,
    statusSystemKey: null,
    client: { id: 100n, uid: 'client_1', name: 'Client One' },
    platforms: [{ uid: overrides.platformUid ?? 'plt_1', name: 'TikTok' }],
  };
}

function buildReviewHead(showId: bigint, overrides: Partial<{ id: bigint; version: number; result: string }> = {}) {
  return {
    id: overrides.id ?? 900n + showId,
    uid: `scqcr_${showId}`,
    showId,
    result: overrides.result ?? 'PASS',
    feedback: null,
    version: overrides.version ?? 1,
    confirmedAt: null,
    reviewedBy: { uid: 'user_reviewer', name: 'Reviewer' },
    reviewedAt: new Date('2026-08-01T07:30:00.000Z'),
    evidenceCount: 1,
  };
}

let mockPrismaForCls: { $transaction: jest.Mock };

@Module({
  providers: [{ provide: PrismaService, useValue: {} }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('sceneQcConfirmationWorkflowService.confirmDay', () => {
  let confirmationRepository: {
    acquireDayLock: jest.Mock;
    findLatestConfirmationWithScope: jest.Mock;
    findMaxRevision: jest.Mock;
    findPlatformIdsByUid: jest.Mock;
    appendConfirmation: jest.Mock;
    markReviewsConfirmed: jest.Mock;
  };
  let sceneQcRepository: { findEligibleShowsInWindow: jest.Mock; findReviewHeadsForShows: jest.Mock };
  let evidenceResolver: { resolveForShows: jest.Mock };
  let auditWriter: { recordDailyConfirmation: jest.Mock };
  let service: SceneQcConfirmationWorkflowService;

  beforeEach(async () => {
    mockPrismaForCls = { $transaction: jest.fn(async (callback: unknown) => (callback as (tx: unknown) => unknown)(mockPrismaForCls)) };

    confirmationRepository = {
      acquireDayLock: jest.fn().mockResolvedValue(undefined),
      findLatestConfirmationWithScope: jest.fn().mockResolvedValue(null),
      findMaxRevision: jest.fn().mockResolvedValue(0),
      findPlatformIdsByUid: jest.fn().mockResolvedValue(new Map([['plt_1', 500n]])),
      appendConfirmation: jest.fn().mockResolvedValue({
        id: 1n,
        uid: 'scqcc_new',
        revision: 1,
        confirmedAt: new Date('2026-08-01T08:00:00.000Z'),
        confirmedBy: { uid: 'user_actor', name: 'Actor' },
      }),
      markReviewsConfirmed: jest.fn().mockResolvedValue(1),
    };
    sceneQcRepository = {
      findEligibleShowsInWindow: jest.fn().mockResolvedValue([buildShow()]),
      findReviewHeadsForShows: jest.fn().mockResolvedValue([buildReviewHead(1n)]),
    };
    evidenceResolver = {
      resolveForShows: jest.fn().mockResolvedValue(new Map([[1n, [{ objectKey: 'k' }]]])),
    };
    auditWriter = {
      recordDailyConfirmation: jest.fn().mockResolvedValue({ uid: 'aud_1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ClsModule.forRoot({
          plugins: [
            new ClsPluginTransactional({
              adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }),
              imports: [MockPrismaModule],
            }),
          ],
        }),
      ],
      providers: [
        SceneQcConfirmationWorkflowService,
        { provide: SceneQcConfirmationRepository, useValue: confirmationRepository },
        { provide: SceneQcRepository, useValue: sceneQcRepository },
        { provide: SceneQcEvidenceResolver, useValue: evidenceResolver },
        { provide: SceneQcAuditWriter, useValue: auditWriter },
        { provide: UidGeneratorService, useValue: { generateBrandedId: jest.fn().mockReturnValue('scqcc_new') } },
        { provide: UserService, useValue: { getUserByExtId: jest.fn().mockResolvedValue({ id: 1n, uid: 'user_actor' }) } },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaForCls)
      .compile();

    service = module.get(SceneQcConfirmationWorkflowService);
  });

  it('acquires the advisory lock before any read', async () => {
    const callOrder: string[] = [];
    confirmationRepository.acquireDayLock.mockImplementation(async () => {
      callOrder.push('lock');
    });
    sceneQcRepository.findEligibleShowsInWindow.mockImplementation(async () => {
      callOrder.push('eligible');
      return [buildShow()];
    });
    sceneQcRepository.findReviewHeadsForShows.mockImplementation(async () => {
      callOrder.push('reviewHeads');
      return [buildReviewHead(1n)];
    });
    evidenceResolver.resolveForShows.mockImplementation(async () => {
      callOrder.push('evidence');
      return new Map([[1n, [{ objectKey: 'k' }]]]);
    });

    await service.confirmDay('std_1', '2026-08-01', { actorExtId: 'ext_1', studioUid: 'std_1' });

    expect(callOrder[0]).toBe('lock');
    expect(callOrder.indexOf('lock')).toBeLessThan(callOrder.indexOf('eligible'));
  });

  it('rejects when there are no eligible Shows for the day', async () => {
    sceneQcRepository.findEligibleShowsInWindow.mockResolvedValue([]);

    await expect(
      service.confirmDay('std_1', '2026-08-01', { actorExtId: 'ext_1', studioUid: 'std_1' }),
    ).rejects.toMatchObject({ status: 422 });
    expect(confirmationRepository.appendConfirmation).not.toHaveBeenCalled();
  });

  it('rejects when any eligible Show has zero live resolved evidence', async () => {
    evidenceResolver.resolveForShows.mockResolvedValue(new Map());

    await expect(
      service.confirmDay('std_1', '2026-08-01', { actorExtId: 'ext_1', studioUid: 'std_1' }),
    ).rejects.toMatchObject({ status: 422 });
    expect(confirmationRepository.appendConfirmation).not.toHaveBeenCalled();
  });

  it('rejects when any eligible Show has no review head for the operational date', async () => {
    sceneQcRepository.findReviewHeadsForShows.mockResolvedValue([]);

    await expect(
      service.confirmDay('std_1', '2026-08-01', { actorExtId: 'ext_1', studioUid: 'std_1' }),
    ).rejects.toMatchObject({ status: 422 });
    expect(confirmationRepository.appendConfirmation).not.toHaveBeenCalled();
  });

  it('appends revision 1 when the day is complete and unconfirmed', async () => {
    const result = await service.confirmDay('std_1', '2026-08-01', { actorExtId: 'ext_1', studioUid: 'std_1' });

    expect(confirmationRepository.appendConfirmation).toHaveBeenCalledTimes(1);
    expect(result.revision).toBe(1);
    expect(result.id).toBe('scqcc_new');
    expect(confirmationRepository.markReviewsConfirmed).toHaveBeenCalledWith({
      reviewIds: [901n],
      confirmedAt: expect.any(Date),
    });
    expect(auditWriter.recordDailyConfirmation).toHaveBeenCalledTimes(1);
  });

  it('replay guard: returns the existing confirmation without appending when it is already CURRENT', async () => {
    confirmationRepository.findLatestConfirmationWithScope.mockResolvedValue({
      id: 5n,
      uid: 'scqcc_existing',
      revision: 3,
      confirmedAt: new Date('2026-08-01T06:00:00.000Z'),
      confirmedBy: { uid: 'user_prior', name: 'Prior Actor' },
      items: [{ showId: 1n, reviewId: 901n, reviewVersion: 1 }],
    });

    const result = await service.confirmDay('std_1', '2026-08-01', { actorExtId: 'ext_1', studioUid: 'std_1' });

    expect(confirmationRepository.appendConfirmation).not.toHaveBeenCalled();
    expect(confirmationRepository.markReviewsConfirmed).not.toHaveBeenCalled();
    expect(auditWriter.recordDailyConfirmation).not.toHaveBeenCalled();
    expect(result.id).toBe('scqcc_existing');
    expect(result.revision).toBe(3);
  });

  it('reconfirmation appends a new revision when the pinned scope has drifted (STALE)', async () => {
    confirmationRepository.findLatestConfirmationWithScope.mockResolvedValue({
      id: 5n,
      uid: 'scqcc_existing',
      revision: 1,
      confirmedAt: new Date('2026-08-01T06:00:00.000Z'),
      confirmedBy: { uid: 'user_prior', name: 'Prior Actor' },
      // Pinned scope references a review id that no longer matches the
      // current effective review -- scope has drifted (STALE).
      items: [{ showId: 1n, reviewId: 999n, reviewVersion: 1 }],
    });
    confirmationRepository.findMaxRevision.mockResolvedValue(1);
    sceneQcRepository.findEligibleShowsInWindow.mockResolvedValue([
      buildShow(),
      buildShow({ id: 2n, uid: 'show_2', name: 'Show Two' }),
    ]);
    sceneQcRepository.findReviewHeadsForShows.mockResolvedValue([buildReviewHead(1n), buildReviewHead(2n)]);
    evidenceResolver.resolveForShows.mockResolvedValue(
      new Map([
        [1n, [{ objectKey: 'k' }]],
        [2n, [{ objectKey: 'k' }]],
      ]),
    );

    await service.confirmDay('std_1', '2026-08-01', { actorExtId: 'ext_1', studioUid: 'std_1' });

    expect(confirmationRepository.appendConfirmation).toHaveBeenCalledTimes(1);
    const call = confirmationRepository.appendConfirmation.mock.calls[0][0];
    expect(call.revision).toBe(2);
    expect(call.items).toHaveLength(2);
  });

  it('resolves the same lock key for the same operational_date regardless of process TZ', async () => {
    // Deliberately mutates the process-wide TZ env var to prove the lock key
    // is derived from the server-validated operational_date string, never
    // the host/browser timezone (breakdown section 1.6.1's last rule).
    // eslint-disable-next-line node/no-process-env
    const originalTz = process.env.TZ;
    try {
      // eslint-disable-next-line node/no-process-env
      process.env.TZ = 'America/Los_Angeles';
      await service.confirmDay('std_1', '2026-08-01', { actorExtId: 'ext_1', studioUid: 'std_1' });
      expect(confirmationRepository.acquireDayLock).toHaveBeenCalledWith({
        studioUid: 'std_1',
        operationalDate: '2026-08-01',
      });

      confirmationRepository.acquireDayLock.mockClear();
      // eslint-disable-next-line node/no-process-env
      process.env.TZ = 'Asia/Tokyo';
      await service.confirmDay('std_1', '2026-08-01', { actorExtId: 'ext_1', studioUid: 'std_1' });
      expect(confirmationRepository.acquireDayLock).toHaveBeenCalledWith({
        studioUid: 'std_1',
        operationalDate: '2026-08-01',
      });
    } finally {
      // eslint-disable-next-line node/no-process-env
      process.env.TZ = originalTz;
    }
  });
});
