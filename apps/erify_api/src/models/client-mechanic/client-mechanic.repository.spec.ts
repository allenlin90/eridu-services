import type { TransactionHost } from '@nestjs-cls/transactional';

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
  let prismaDelegate: ReturnType<typeof createClientMechanicDelegateMock>;
  let txDelegate: ReturnType<typeof createClientMechanicDelegateMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaDelegate = createClientMechanicDelegateMock();
    txDelegate = createClientMechanicDelegateMock();

    const prisma = { clientMechanic: prismaDelegate } as unknown as PrismaService;
    const txHost = {
      tx: { clientMechanic: txDelegate },
    } as unknown as TransactionHost<any>;
    repository = new ClientMechanicRepository(prisma, txHost);
  });

  describe('findByUidForClient', () => {
    it('excludes mechanics whose owning client is soft-deleted', async () => {
      txDelegate.findFirst.mockResolvedValue(null);

      await repository.findByUidForClient({ uid: 'cmech_123', clientUid: 'client_1' });

      expect(txDelegate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            uid: 'cmech_123',
            client: { uid: 'client_1', deletedAt: null },
            deletedAt: null,
          },
        }),
      );
      expect(prismaDelegate.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('updateWithVersionCheck', () => {
    it('excludes mechanics whose owning client is soft-deleted', async () => {
      txDelegate.update.mockResolvedValue({ uid: 'cmech_123' });

      await repository.updateWithVersionCheck(
        { uid: 'cmech_123', clientUid: 'client_1', version: 3 },
        { title: 'Renamed' },
      );

      expect(txDelegate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            uid: 'cmech_123',
            version: 3,
            client: { uid: 'client_1', deletedAt: null },
            deletedAt: null,
          },
        }),
      );
      expect(prismaDelegate.update).not.toHaveBeenCalled();
    });
  });
});
