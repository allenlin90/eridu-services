import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { SceneQcAmendmentService } from './scene-qc-amendment.service';
import { SceneQcAuditWriter } from './scene-qc-audit.writer';
import { SceneQcRepository } from './scene-qc-review.repository';
import { SceneQcTaxonomyService } from './scene-qc-taxonomy.service';

import { UidGeneratorService } from '@/lib/uid/uid-generator.service';
import { UserService } from '@/models/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';

const REVIEW = {
  id: 10n,
  uid: 'scqcr_review1',
  confirmedAt: new Date('2026-07-30T10:00:00.000Z'),
  expectedSceneType: 'GRAPHIC_BG' as const,
};

@Module({
  providers: [{ provide: PrismaService, useValue: {} }],
  exports: [PrismaService],
})
class MockPrismaModule {}

async function buildHarness() {
  const repository = {
    findReviewForUpdate: jest.fn().mockResolvedValue(REVIEW),
    appendReviewAmendment: jest.fn().mockResolvedValue({
      uid: 'scqca_amendment1',
      revision: 1,
      result: null,
      note: 'Confirmed after review',
      findings: [],
      createdBy: { uid: 'user_actor1', name: 'Actor' },
      createdAt: new Date('2026-07-30T11:00:00.000Z'),
    }),
  };
  const taxonomyService = {
    resolveFindings: jest.fn().mockResolvedValue([]),
  };
  const auditWriter = {
    recordSceneQcReviewChange: jest.fn().mockResolvedValue({ uid: 'aud_1' }),
  };
  const uidGenerator = {
    generateBrandedId: jest.fn().mockReturnValue('scqca_amendment1'),
  };
  const userService = {
    getUserByExtId: jest.fn().mockResolvedValue({ id: 20n, uid: 'user_actor1' }),
  };
  const mockPrismaForCls = {
    $transaction: jest.fn(async (callback: (tx: unknown) => unknown) => callback({})),
  };
  const module = await Test.createTestingModule({
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
      SceneQcAmendmentService,
      { provide: SceneQcRepository, useValue: repository },
      { provide: SceneQcTaxonomyService, useValue: taxonomyService },
      { provide: SceneQcAuditWriter, useValue: auditWriter },
      { provide: UidGeneratorService, useValue: uidGenerator },
      { provide: UserService, useValue: userService },
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(mockPrismaForCls)
    .compile();
  const service = module.get(SceneQcAmendmentService);
  return { service, repository, taxonomyService, auditWriter };
}

describe('sceneQcAmendmentService', () => {
  it('appends a comment without mutating the confirmed review', async () => {
    const { service, repository, taxonomyService, auditWriter } = await buildHarness();

    const result = await service.append(
      'std_studio1',
      REVIEW.uid,
      { note: '  Confirmed after review  ', result: null, findings: [] },
      'ext_actor1',
    );

    expect(repository.appendReviewAmendment).toHaveBeenCalledWith(expect.objectContaining({
      reviewId: REVIEW.id,
      result: null,
      note: 'Confirmed after review',
      findings: [],
    }));
    expect(taxonomyService.resolveFindings).not.toHaveBeenCalled();
    expect(auditWriter.recordSceneQcReviewChange).toHaveBeenCalledWith(expect.objectContaining({
      action: 'UPDATE',
      sceneQcReviewId: REVIEW.id,
    }));
    expect(result).toMatchObject({ id: 'scqca_amendment1', revision: 1 });
  });

  it('rejects amendments before confirmation and performs no append', async () => {
    const { service, repository } = await buildHarness();
    repository.findReviewForUpdate.mockResolvedValue({ ...REVIEW, confirmedAt: null });

    await expect(service.append(
      'std_studio1',
      REVIEW.uid,
      { note: 'Too early', result: null, findings: [] },
      'ext_actor1',
    )).rejects.toMatchObject({ status: 409 });
    expect(repository.appendReviewAmendment).not.toHaveBeenCalled();
  });

  it('resolves and pins structured findings for a result correction', async () => {
    const { service, repository, taxonomyService } = await buildHarness();
    const findingInput = {
      element_id: 'scqce_element1',
      defect_id: 'scqcd_defect1',
      related_element_id: null,
    };
    const pinned = [{
      sortOrder: 0,
      elementId: 1n,
      elementKey: 'logo',
      elementLabel: 'Logo',
      defectId: 2n,
      defectKey: 'missing',
      defectLabel: 'Missing',
      relatedElementId: null,
      relatedElementKey: null,
      relatedElementLabel: null,
    }];
    taxonomyService.resolveFindings.mockResolvedValue(pinned);
    repository.appendReviewAmendment.mockResolvedValue({
      uid: 'scqca_amendment1',
      revision: 2,
      result: 'FAIL',
      note: 'Corrected classification',
      findings: [],
      createdBy: { uid: 'user_actor1', name: 'Actor' },
      createdAt: new Date('2026-07-30T11:00:00.000Z'),
    });

    await service.append(
      'std_studio1',
      REVIEW.uid,
      { note: 'Corrected classification', result: 'FAIL', findings: [findingInput] },
      'ext_actor1',
    );

    expect(taxonomyService.resolveFindings).toHaveBeenCalledWith(
      [findingInput],
      'GRAPHIC_BG',
    );
    expect(repository.appendReviewAmendment).toHaveBeenCalledWith(expect.objectContaining({
      result: 'FAIL',
      findings: pinned,
    }));
  });
});
