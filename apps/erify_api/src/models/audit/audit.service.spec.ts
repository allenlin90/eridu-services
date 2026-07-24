import { BadRequestException } from '@nestjs/common';

import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

import { UidGeneratorService } from '@/lib/uid/uid-generator.service';
import {
  createMockUidGeneratorService,
  createModelServiceTestModule,
} from '@/testing/model-service-test.helper';

describe('auditService', () => {
  let service: AuditService;
  let repository: jest.Mocked<AuditRepository>;
  let utility: jest.Mocked<UidGeneratorService>;

  beforeEach(async () => {
    // AuditRepository does not extend BaseRepository (Audit is append-only — no
    // softDelete/update/findMany/count), so the BaseRepositoryMethods constraint
    // on createMockRepository does not apply. Build the mock directly.
    const repositoryMock: Partial<jest.Mocked<AuditRepository>> = {
      create: jest.fn(),
      findByUid: jest.fn(),
      findForTargets: jest.fn(),
    };
    const uidGeneratorMock = createMockUidGeneratorService('aud_generated');

    const module = await createModelServiceTestModule({
      serviceClass: AuditService,
      repositoryClass: AuditRepository,
      repositoryMock,
      uidGeneratorMock,
    });

    service = module.get(AuditService);
    repository = module.get(AuditRepository);
    utility = module.get(UidGeneratorService);
  });

  it('uses the aud_ UID prefix', () => {
    expect(AuditService.UID_PREFIX).toBe('aud');
  });

  it('generates a UID when the caller omits one', async () => {
    (repository.create as jest.Mock).mockResolvedValue({} as any);

    await service.create({
      action: 'CREATE',
      metadata: { ingestion_source: 'task_submission' },
      targets: [{ targetType: 'SHOW', targetId: BigInt(1) }],
    });

    expect(utility.generateBrandedId).toHaveBeenCalledWith('aud', undefined);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'aud_generated' }),
    );
  });

  it('respects an explicit UID when supplied (idempotent retry path)', async () => {
    (repository.create as jest.Mock).mockResolvedValue({} as any);

    await service.create({
      uid: 'aud_explicit',
      action: 'OVERRIDE',
      actorId: BigInt(5),
      targets: [{ targetType: 'SHOW_CREATOR', targetId: BigInt(1) }],
    });

    expect(utility.generateBrandedId).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'aud_explicit', actorId: BigInt(5) }),
    );
  });

  it('rejects payloads with no targets', async () => {
    await expect(
      service.create({
        action: 'CREATE',
        targets: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
