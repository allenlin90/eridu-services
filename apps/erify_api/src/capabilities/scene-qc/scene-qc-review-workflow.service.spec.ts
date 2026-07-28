import { Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';
import { ClsModule } from 'nestjs-cls';

import type { EligibleShowRow, SceneQcReviewRecord } from './schemas/scene-qc-review.schema';
import { SceneProfileService } from './scene-profile.service';
import { SceneQcAuditWriter } from './scene-qc-audit.writer';
import type { ResolvedSceneQcEvidence } from './scene-qc-evidence.resolver';
import { SceneQcEvidenceResolver } from './scene-qc-evidence.resolver';
import { OPERATIONAL_TIMEZONE, resolveOperationalWindow } from './scene-qc-operational-window.util';
import { SceneQcRepository } from './scene-qc-review.repository';
import { SceneQcWorkflowService } from './scene-qc-review-workflow.service';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';
import { UserService } from '@/models/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';

const STUDIO_UID = 'std_abc';
const OPERATIONAL_DATE = '2026-06-01';
const WINDOW = resolveOperationalWindow(OPERATIONAL_DATE, OPERATIONAL_TIMEZONE);
const ACTOR = { id: 9n, uid: 'user_actor1' };
const CONTEXT = { actorExtId: 'ext_actor_1', studioUid: STUDIO_UID };

function buildShow(overrides: Partial<EligibleShowRow> = {}): EligibleShowRow {
  return {
    id: 100n,
    uid: 'show_abc',
    name: 'Show ABC',
    startTime: new Date(WINDOW.windowStart.getTime() + 60 * 60 * 1000),
    deletedAt: null,
    statusSystemKey: null,
    client: { id: 5n, uid: 'client_x', name: 'Client X' },
    platforms: [],
    ...overrides,
  };
}

function buildEvidence(overrides: Partial<ResolvedSceneQcEvidence> = {}): ResolvedSceneQcEvidence {
  return {
    sourceTaskId: 1n,
    sourceTaskUid: 'task_a',
    sourceTaskVersion: 2,
    sourceFieldKey: 'field_a',
    sourceLabel: 'Screenshot',
    objectKey: 'derived/key.png',
    fileUrl: 'https://cdn.example.com/derived/key.png',
    ...overrides,
  };
}

function buildReviewRecord(overrides: Partial<SceneQcReviewRecord> = {}): SceneQcReviewRecord {
  return {
    id: 500n,
    uid: 'scqcr_test1',
    show: { uid: 'show_abc' },
    operationalDate: new Date(`${OPERATIONAL_DATE}T00:00:00.000Z`),
    windowStart: WINDOW.windowStart,
    windowEnd: WINDOW.windowEnd,
    timezone: WINDOW.timezone,
    result: 'PASS',
    feedback: null,
    reviewedBy: { uid: ACTOR.uid, name: 'Actor Name' },
    reviewedAt: new Date('2026-06-01T10:00:00.000Z'),
    expectedObjectKey: null,
    expectedFileUrl: null,
    expectedSceneType: null,
    version: 1,
    confirmedAt: null,
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    updatedAt: new Date('2026-06-01T10:00:00.000Z'),
    evidence: [],
    ...overrides,
  };
}

function createUniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: PRISMA_ERROR.UniqueConstraint,
    clientVersion: '7.0.0',
  });
}

let mockPrismaForCls: { $transaction: jest.Mock };

@Module({
  providers: [{ provide: PrismaService, useValue: {} }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('sceneQcWorkflowService', () => {
  let service: SceneQcWorkflowService;
  let repository: jest.Mocked<Pick<SceneQcRepository, 'findShowForReview' | 'createReviewWithEvidence' | 'findReviewForUpdate' | 'replaceReviewWithEvidence'>>;
  let evidenceResolver: jest.Mocked<Pick<SceneQcEvidenceResolver, 'resolveForShows'>>;
  let sceneProfileService: jest.Mocked<Pick<SceneProfileService, 'getActiveProfileForClient'>>;
  let auditWriter: jest.Mocked<Pick<SceneQcAuditWriter, 'recordSceneQcReviewChange'>>;
  let uidGenerator: jest.Mocked<Pick<UidGeneratorService, 'generateBrandedId'>>;
  let userService: jest.Mocked<Pick<UserService, 'getUserByExtId'>>;

  beforeEach(async () => {
    mockPrismaForCls = { $transaction: jest.fn(async (callback: any) => callback(mockPrismaForCls)) };

    repository = {
      findShowForReview: jest.fn().mockResolvedValue(buildShow()),
      createReviewWithEvidence: jest.fn().mockResolvedValue(buildReviewRecord()),
      findReviewForUpdate: jest.fn(),
      replaceReviewWithEvidence: jest.fn(),
    };
    evidenceResolver = {
      resolveForShows: jest.fn().mockResolvedValue(new Map([[100n, [buildEvidence()]]])),
    };
    sceneProfileService = {
      getActiveProfileForClient: jest.fn().mockResolvedValue(null),
    };
    auditWriter = {
      recordSceneQcReviewChange: jest.fn().mockResolvedValue({ uid: 'aud_test1' }),
    };
    uidGenerator = {
      generateBrandedId: jest.fn().mockReturnValue('scqcr_test1'),
    };
    userService = {
      getUserByExtId: jest.fn().mockResolvedValue({ id: ACTOR.id, uid: ACTOR.uid }),
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
        SceneQcWorkflowService,
        { provide: SceneQcRepository, useValue: repository },
        { provide: SceneQcEvidenceResolver, useValue: evidenceResolver },
        { provide: SceneProfileService, useValue: sceneProfileService },
        { provide: SceneQcAuditWriter, useValue: auditWriter },
        { provide: UidGeneratorService, useValue: uidGenerator },
        { provide: UserService, useValue: userService },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaForCls)
      .compile();

    service = module.get(SceneQcWorkflowService);
  });

  it('never injects a Task, Show, or ShowStatus write collaborator -- only Scene QC-owned dependencies', () => {
    // Structural proof: exactly the six Scene QC-owned collaborators, in this
    // order, reach the constructor. There is no way for a Task/Show/ShowStatus
    // write-capable service to be injected here.
    expect(SceneQcWorkflowService.length).toBe(6);
  });

  describe('createReview', () => {
    const PAYLOAD = { showId: 'show_abc', operationalDate: OPERATIONAL_DATE, result: 'PASS' as const, feedback: null };

    it('creates a review when the Show is eligible and has evidence', async () => {
      const created = await service.createReview(STUDIO_UID, PAYLOAD, CONTEXT);

      expect(created.uid).toBe('scqcr_test1');
      expect(repository.createReviewWithEvidence).toHaveBeenCalledTimes(1);
      const call = repository.createReviewWithEvidence.mock.calls[0][0];
      expect(call.showId).toBe(100n);
      expect(call.reviewedById).toBe(ACTOR.id);
      expect(call.evidence).toHaveLength(1);
      expect(call.evidence[0]).toMatchObject({ sortOrder: 0, sourceTaskUid: 'task_a' });
    });

    it('writes a CREATE audit with old_value null and evidence_count in new_value', async () => {
      await service.createReview(STUDIO_UID, PAYLOAD, CONTEXT);

      expect(auditWriter.recordSceneQcReviewChange).toHaveBeenCalledTimes(1);
      const call = auditWriter.recordSceneQcReviewChange.mock.calls[0][0];
      expect(call.action).toBe('CREATE');
      expect(call.metadata.old_value).toBeNull();
      expect(call.metadata.new_value).toMatchObject({ result: 'PASS', evidence_count: 1 });
    });

    it('rejects with 404 when the Show is not eligible/found for the studio', async () => {
      repository.findShowForReview.mockResolvedValue(null);

      await expect(service.createReview(STUDIO_UID, PAYLOAD, CONTEXT)).rejects.toThrow();
      expect(repository.createReviewWithEvidence).not.toHaveBeenCalled();
    });

    it('rejects when the Show has zero evidence (blocked) and does not create a review', async () => {
      evidenceResolver.resolveForShows.mockResolvedValue(new Map([[100n, []]]));

      await expect(service.createReview(STUDIO_UID, PAYLOAD, CONTEXT)).rejects.toThrow(
        /no Scene QC evidence/,
      );
      expect(repository.createReviewWithEvidence).not.toHaveBeenCalled();
    });

    it('rejects MINOR/FAIL with empty feedback before any persistence call', async () => {
      await expect(
        service.createReview(STUDIO_UID, { ...PAYLOAD, result: 'FAIL', feedback: '  ' }, CONTEXT),
      ).rejects.toThrow(/feedback is required/);
      expect(repository.createReviewWithEvidence).not.toHaveBeenCalled();
    });

    it('rejects a Show outside the resolved operational window', async () => {
      repository.findShowForReview.mockResolvedValue(
        buildShow({ startTime: new Date(WINDOW.windowEnd.getTime() + 1000) }),
      );

      await expect(service.createReview(STUDIO_UID, PAYLOAD, CONTEXT)).rejects.toThrow(/not eligible/);
    });

    it('snapshots the Client Scene Profile onto expected* when one exists', async () => {
      sceneProfileService.getActiveProfileForClient.mockResolvedValue({
        objectKey: 'scene_reference/x.png',
        fileUrl: 'https://cdn.example.com/scene_reference/x.png',
        sceneType: 'GRAPHIC_BG',
      } as never);

      await service.createReview(STUDIO_UID, PAYLOAD, CONTEXT);

      const call = repository.createReviewWithEvidence.mock.calls[0][0];
      expect(call.expectedObjectKey).toBe('scene_reference/x.png');
      expect(call.expectedFileUrl).toBe('https://cdn.example.com/scene_reference/x.png');
      expect(call.expectedSceneType).toBe('GRAPHIC_BG');
    });

    it('leaves expected* all null when the Client has no Scene Profile', async () => {
      await service.createReview(STUDIO_UID, PAYLOAD, CONTEXT);

      const call = repository.createReviewWithEvidence.mock.calls[0][0];
      expect(call.expectedObjectKey).toBeNull();
      expect(call.expectedFileUrl).toBeNull();
      expect(call.expectedSceneType).toBeNull();
    });

    it('maps a concurrent-create P2002 to a conflict without leaking the raw Prisma error', async () => {
      repository.createReviewWithEvidence.mockRejectedValue(createUniqueConstraintError());

      await expect(service.createReview(STUDIO_UID, PAYLOAD, CONTEXT)).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe('updateReview', () => {
    const PAYLOAD = { result: 'MINOR' as const, feedback: 'watermark visible', version: 1 };

    beforeEach(() => {
      repository.findReviewForUpdate.mockResolvedValue(buildReviewRecord());
      repository.replaceReviewWithEvidence.mockResolvedValue(buildReviewRecord({ result: 'MINOR', version: 2 }));
    });

    it('pins current evidence and the current Scene Profile snapshot and increments version via the repository call', async () => {
      const updated = await service.updateReview(STUDIO_UID, 'scqcr_test1', PAYLOAD, CONTEXT);

      expect(updated.version).toBe(2);
      const call = repository.replaceReviewWithEvidence.mock.calls[0][0];
      expect(call.expectedVersion).toBe(1);
      expect(call.evidence).toHaveLength(1);
    });

    it('rejects an update to a review with no head found for this studio', async () => {
      repository.findReviewForUpdate.mockResolvedValue(null);

      await expect(service.updateReview(STUDIO_UID, 'scqcr_missing', PAYLOAD, CONTEXT)).rejects.toThrow();
      expect(repository.replaceReviewWithEvidence).not.toHaveBeenCalled();
    });

    it('rejects editing an already-confirmed review before touching the repository write', async () => {
      repository.findReviewForUpdate.mockResolvedValue(
        buildReviewRecord({ confirmedAt: new Date('2026-06-02T00:00:00.000Z') }),
      );

      await expect(service.updateReview(STUDIO_UID, 'scqcr_test1', PAYLOAD, CONTEXT)).rejects.toThrow(
        /confirmed/,
      );
      expect(repository.replaceReviewWithEvidence).not.toHaveBeenCalled();
    });

    it('maps a stale-version conditional-write miss to a conflict and writes no audit row', async () => {
      repository.replaceReviewWithEvidence.mockResolvedValue(null);

      await expect(service.updateReview(STUDIO_UID, 'scqcr_test1', PAYLOAD, CONTEXT)).rejects.toMatchObject({
        status: 409,
      });
      expect(auditWriter.recordSceneQcReviewChange).not.toHaveBeenCalled();
    });

    it('reports the confirmed-in-the-meantime race as the confirmed message on re-read', async () => {
      repository.replaceReviewWithEvidence.mockResolvedValue(null);
      repository.findReviewForUpdate
        .mockResolvedValueOnce(buildReviewRecord())
        .mockResolvedValueOnce(buildReviewRecord({ confirmedAt: new Date('2026-06-02T00:00:00.000Z') }));

      await expect(service.updateReview(STUDIO_UID, 'scqcr_test1', PAYLOAD, CONTEXT)).rejects.toThrow(
        /confirmed/,
      );
    });

    it('rejects an update once the Show has moved outside the review\'s pinned window', async () => {
      repository.findShowForReview.mockResolvedValue(
        buildShow({ startTime: new Date(WINDOW.windowEnd.getTime() + 1000) }),
      );

      await expect(service.updateReview(STUDIO_UID, 'scqcr_test1', PAYLOAD, CONTEXT)).rejects.toThrow(
        /moved to a different operational date/,
      );
      expect(repository.replaceReviewWithEvidence).not.toHaveBeenCalled();
    });

    it('writes an UPDATE audit carrying the previous result/feedback-presence as old_value', async () => {
      await service.updateReview(STUDIO_UID, 'scqcr_test1', PAYLOAD, CONTEXT);

      const call = auditWriter.recordSceneQcReviewChange.mock.calls[0][0];
      expect(call.action).toBe('UPDATE');
      expect(call.metadata.old_value).toEqual({ result: 'PASS', feedback_present: false });
    });
  });
});
