import { ConflictException } from '@nestjs/common';

import { ClientMechanicRepository } from './client-mechanic.repository';
import { ClientMechanicService } from './client-mechanic.service';

import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
  setupTestMocks,
} from '@/testing/model-service-test.helper';
import type { UtilityService } from '@/utility/utility.service';

const baseMechanic = {
  id: BigInt(1),
  uid: 'cmech_123',
  client: { uid: 'client_1' },
  title: 'Product mechanic',
  instructionLabel: 'Product mechanic',
  instructionBody: 'Mention the product features',
  status: 'active',
  version: 3,
  contentRevision: 5,
  metadata: {},
};

describe('clientMechanicService', () => {
  let service: ClientMechanicService;
  let repositoryMock: Partial<jest.Mocked<ClientMechanicRepository>>;
  let utilityMock: Partial<jest.Mocked<UtilityService>>;

  beforeEach(async () => {
    repositoryMock = createMockRepository<ClientMechanicRepository>({
      findByUidForClient: jest.fn(),
      findPaginated: jest.fn(),
      updateWithVersionCheck: jest.fn(),
    });
    utilityMock = createMockUtilityService('cmech_123');

    const module = await createModelServiceTestModule({
      serviceClass: ClientMechanicService,
      repositoryClass: ClientMechanicRepository,
      repositoryMock,
      utilityMock,
    });

    service = module.get(ClientMechanicService);
  });

  beforeEach(() => {
    setupTestMocks();
  });

  describe('createMechanic', () => {
    it('generates a UID and connects the client', async () => {
      (repositoryMock.create as jest.Mock).mockResolvedValue(baseMechanic);

      await service.createMechanic('client_1', { title: 'T', instructionLabel: 'L', instructionBody: 'B' });

      expect(utilityMock.generateBrandedId).toHaveBeenCalledWith('cmech', undefined);
      const [data] = (repositoryMock.create as jest.Mock).mock.calls[0];
      expect(data).toMatchObject({
        uid: 'cmech_123',
        title: 'T',
        instructionLabel: 'L',
        instructionBody: 'B',
        client: { connect: { uid: 'client_1' } },
      });
      expect(data.createdByUser).toBeUndefined();
    });
  });

  describe('updateMechanic — contentRevision bump', () => {
    it('bumps contentRevision when the instruction body changes', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);
      (repositoryMock.updateWithVersionCheck as jest.Mock).mockResolvedValue(baseMechanic);

      await service.updateMechanic(
        { mechanicUid: 'cmech_123', clientUid: 'client_1' },
        { instructionBody: 'New instruction', version: 3 },
      );

      const [, data] = (repositoryMock.updateWithVersionCheck as jest.Mock).mock.calls[0];
      expect(data.contentRevision).toBe(6); // 5 -> 6
      expect(data.version).toBe(4); // 3 -> 4
    });

    it('does NOT bump contentRevision when only the title changes', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);
      (repositoryMock.updateWithVersionCheck as jest.Mock).mockResolvedValue(baseMechanic);

      await service.updateMechanic(
        { mechanicUid: 'cmech_123', clientUid: 'client_1' },
        { title: 'Renamed', version: 3 },
      );

      const [, data] = (repositoryMock.updateWithVersionCheck as jest.Mock).mock.calls[0];
      expect(data.contentRevision).toBeUndefined();
      expect(data.version).toBe(4); // version still bumps on any semantic edit
    });

    it('does NOT bump contentRevision when the body is re-submitted unchanged', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);
      (repositoryMock.updateWithVersionCheck as jest.Mock).mockResolvedValue(baseMechanic);

      await service.updateMechanic(
        { mechanicUid: 'cmech_123', clientUid: 'client_1' },
        { instructionBody: baseMechanic.instructionBody, version: 3 },
      );

      const [, data] = (repositoryMock.updateWithVersionCheck as jest.Mock).mock.calls[0];
      expect(data.contentRevision).toBeUndefined();
    });
  });

  describe('updateMechanic — scoping & locking', () => {
    it('returns null for a mechanic not under the client', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(null);

      const result = await service.updateMechanic(
        { mechanicUid: 'cmech_x', clientUid: 'client_1' },
        { title: 'T', version: 1 },
      );

      expect(result).toBeNull();
      expect(repositoryMock.updateWithVersionCheck).not.toHaveBeenCalled();
    });

    it('maps a stale version to a 409 conflict', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);
      (repositoryMock.updateWithVersionCheck as jest.Mock).mockRejectedValue(
        new VersionConflictError('stale', 1, 3),
      );

      await expect(
        service.updateMechanic(
          { mechanicUid: 'cmech_123', clientUid: 'client_1' },
          { title: 'T', version: 1 },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('retireMechanic', () => {
    it('sets status to retired and bumps version via the version-guarded update', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);
      (repositoryMock.updateWithVersionCheck as jest.Mock).mockResolvedValue({
        ...baseMechanic,
        status: 'retired',
      });

      const result = await service.retireMechanic({ mechanicUid: 'cmech_123', clientUid: 'client_1' });

      expect(repositoryMock.updateWithVersionCheck).toHaveBeenCalledWith(
        { uid: 'cmech_123', clientUid: 'client_1', version: 3 },
        { status: 'retired', version: 4 },
      );
      expect(result).toMatchObject({ status: 'retired' });
    });

    it('maps a concurrent edit racing the retire to a 409 conflict', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(baseMechanic);
      (repositoryMock.updateWithVersionCheck as jest.Mock).mockRejectedValue(
        new VersionConflictError('stale', 3, 4),
      );

      await expect(
        service.retireMechanic({ mechanicUid: 'cmech_123', clientUid: 'client_1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('is idempotent for an already-retired mechanic (no write)', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue({
        ...baseMechanic,
        status: 'retired',
      });

      const result = await service.retireMechanic({ mechanicUid: 'cmech_123', clientUid: 'client_1' });

      expect(repositoryMock.updateWithVersionCheck).not.toHaveBeenCalled();
      expect(result).toMatchObject({ status: 'retired' });
    });

    it('returns null when the mechanic is not found', async () => {
      (repositoryMock.findByUidForClient as jest.Mock).mockResolvedValue(null);

      const result = await service.retireMechanic({ mechanicUid: 'cmech_404', clientUid: 'client_1' });

      expect(result).toBeNull();
      expect(repositoryMock.updateWithVersionCheck).not.toHaveBeenCalled();
    });
  });
});
