import { ClientMechanicRepository } from './client-mechanic.repository';

import type { PrismaService } from '@/prisma/prisma.service';

function createClientMechanicDelegateMock() {
  return {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
}

describe('clientMechanicRepository', () => {
  let repository: ClientMechanicRepository;
  const prismaDelegate = createClientMechanicDelegateMock();

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = { clientMechanic: prismaDelegate } as unknown as PrismaService;
    repository = new ClientMechanicRepository(prisma);
  });

  describe('findByUidForClient', () => {
    it('excludes mechanics whose owning client is soft-deleted', async () => {
      prismaDelegate.findFirst.mockResolvedValue(null);

      await repository.findByUidForClient({ uid: 'cmech_123', clientUid: 'client_1' });

      expect(prismaDelegate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            uid: 'cmech_123',
            client: { uid: 'client_1', deletedAt: null },
            deletedAt: null,
          },
        }),
      );
    });
  });

  describe('updateWithVersionCheck', () => {
    it('excludes mechanics whose owning client is soft-deleted', async () => {
      prismaDelegate.update.mockResolvedValue({ uid: 'cmech_123' });

      await repository.updateWithVersionCheck(
        { uid: 'cmech_123', clientUid: 'client_1', version: 3 },
        { title: 'Renamed' },
      );

      expect(prismaDelegate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            uid: 'cmech_123',
            version: 3,
            client: { uid: 'client_1', deletedAt: null },
            deletedAt: null,
          },
        }),
      );
    });
  });
});
