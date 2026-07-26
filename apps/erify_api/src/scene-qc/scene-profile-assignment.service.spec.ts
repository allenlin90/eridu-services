import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { SceneProfileRepository } from './persistence/scene-profile.repository';
import { SceneProfileAssignmentRepository } from './persistence/scene-profile-assignment.repository';
import { SceneProfileAssignmentService } from './scene-profile-assignment.service';

import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createMockRepository, createMockUidGeneratorService } from '@/testing/model-service-test.helper';

const mockPrismaForCls = { $transaction: jest.fn((callback: any) => callback({})) };

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

describe('sceneProfileAssignmentService', () => {
  let service: SceneProfileAssignmentService;
  let assignmentRepository: jest.Mocked<SceneProfileAssignmentRepository>;
  let profileRepository: jest.Mocked<SceneProfileRepository>;

  beforeEach(async () => {
    assignmentRepository = createMockRepository<SceneProfileAssignmentRepository>({
      findShowForAssignment: jest.fn(),
      findActiveByShowId: jest.fn(),
      findActiveByShowUid: jest.fn(),
      upsertActiveAssignment: jest.fn(),
      softDeleteWithVersionCheck: jest.fn(),
    }) as any;
    profileRepository = createMockRepository<SceneProfileRepository>({
      findByUidForClient: jest.fn(),
    }) as any;

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
        SceneProfileAssignmentService,
        { provide: SceneProfileAssignmentRepository, useValue: assignmentRepository },
        { provide: SceneProfileRepository, useValue: profileRepository },
        { provide: UidGeneratorService, useValue: createMockUidGeneratorService('scasgn_new') },
      ],
    }).compile();

    service = module.get(SceneProfileAssignmentService);
  });

  describe('assignProfileToShow', () => {
    it('rejects a profile owned by another Client', async () => {
      assignmentRepository.findShowForAssignment.mockResolvedValue({
        id: 1n,
        uid: 'show_1',
        clientId: 5n,
        clientUid: 'client_1',
      });
      // Scoped lookup by the Show's own client finds nothing — the profile
      // belongs to a different Client.
      profileRepository.findByUidForClient.mockResolvedValue(null);

      await expect(
        service.assignProfileToShow({ showUid: 'show_1', profileUid: 'scprof_other_client' }),
      ).rejects.toMatchObject({ message: expect.stringContaining('SCENE_PROFILE_CLIENT_MISMATCH') });

      expect(assignmentRepository.upsertActiveAssignment).not.toHaveBeenCalled();
    });

    it('rejects a RETIRED profile', async () => {
      assignmentRepository.findShowForAssignment.mockResolvedValue({
        id: 1n,
        uid: 'show_1',
        clientId: 5n,
        clientUid: 'client_1',
      });
      profileRepository.findByUidForClient.mockResolvedValue({
        id: 2n,
        status: 'RETIRED',
      } as any);

      await expect(
        service.assignProfileToShow({ showUid: 'show_1', profileUid: 'scprof_1' }),
      ).rejects.toMatchObject({ message: expect.stringContaining('SCENE_PROFILE_NOT_ACTIVE') });
    });

    it('assigns an active same-Client profile', async () => {
      assignmentRepository.findShowForAssignment.mockResolvedValue({
        id: 1n,
        uid: 'show_1',
        clientId: 5n,
        clientUid: 'client_1',
      });
      profileRepository.findByUidForClient.mockResolvedValue({ id: 2n, status: 'ACTIVE' } as any);
      assignmentRepository.findActiveByShowId.mockResolvedValue(null);
      assignmentRepository.upsertActiveAssignment.mockResolvedValue({ id: 9n } as any);

      const result = await service.assignProfileToShow({ showUid: 'show_1', profileUid: 'scprof_1' });

      expect(result).toEqual({ id: 9n });
      expect(assignmentRepository.upsertActiveAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ showId: 1n, profileId: 2n }),
      );
    });

    it('maps a version conflict to HttpError 409', async () => {
      assignmentRepository.findShowForAssignment.mockResolvedValue({
        id: 1n,
        uid: 'show_1',
        clientId: 5n,
        clientUid: 'client_1',
      });
      profileRepository.findByUidForClient.mockResolvedValue({ id: 2n, status: 'ACTIVE' } as any);
      assignmentRepository.findActiveByShowId.mockResolvedValue({ version: 2 } as any);
      assignmentRepository.upsertActiveAssignment.mockRejectedValue(new VersionConflictError('stale', 1, 2));

      await expect(
        service.assignProfileToShow({ showUid: 'show_1', profileUid: 'scprof_1', version: 1 }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('unassignProfileFromShow', () => {
    it('soft-deletes the active assignment', async () => {
      assignmentRepository.findShowForAssignment.mockResolvedValue({
        id: 1n,
        uid: 'show_1',
        clientId: 5n,
        clientUid: 'client_1',
      });
      assignmentRepository.softDeleteWithVersionCheck.mockResolvedValue({ id: 9n, deletedAt: new Date() } as any);

      const result = await service.unassignProfileFromShow({ showUid: 'show_1', version: 3 });

      expect(assignmentRepository.softDeleteWithVersionCheck).toHaveBeenCalledWith({ showId: 1n, version: 3 });
      expect(result).toEqual({ id: 9n, deletedAt: expect.any(Date) });
    });

    it('returns null when the Show does not exist', async () => {
      assignmentRepository.findShowForAssignment.mockResolvedValue(null);

      const result = await service.unassignProfileFromShow({ showUid: 'show_missing', version: 1 });

      expect(result).toBeNull();
      expect(assignmentRepository.softDeleteWithVersionCheck).not.toHaveBeenCalled();
    });
  });

  describe('reassign after unassign (revive path)', () => {
    it('a subsequent assign after unassign upserts (revives) rather than erroring on the unique index', async () => {
      assignmentRepository.findShowForAssignment.mockResolvedValue({
        id: 1n,
        uid: 'show_1',
        clientId: 5n,
        clientUid: 'client_1',
      });
      profileRepository.findByUidForClient.mockResolvedValue({ id: 2n, status: 'ACTIVE' } as any);
      // No *active* assignment remains after unassign, so assign proceeds as
      // a fresh upsert — the repository layer is responsible for reviving
      // the soft-deleted row instead of violating the partial unique index.
      assignmentRepository.findActiveByShowId.mockResolvedValue(null);
      assignmentRepository.upsertActiveAssignment.mockResolvedValue({ id: 9n, deletedAt: null } as any);

      const result = await service.assignProfileToShow({ showUid: 'show_1', profileUid: 'scprof_1' });

      expect(result).toEqual({ id: 9n, deletedAt: null });
    });
  });
});
