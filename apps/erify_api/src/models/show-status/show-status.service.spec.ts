import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import { ShowStatusService } from './show-status.service';

import type { UidGeneratorService } from '@/lib/uid/uid-generator.service';

function createShowStatusDelegateMock() {
  return {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
}

function createShowStatus(overrides: Record<string, unknown> = {}) {
  return {
    id: 1n,
    uid: 'shst_test123',
    systemKey: null,
    name: 'Draft',
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('showStatusService', () => {
  let service: ShowStatusService;
  let delegate: ReturnType<typeof createShowStatusDelegateMock>;
  let uidGenerator: jest.Mocked<Pick<UidGeneratorService, 'generateBrandedId'>>;

  beforeEach(() => {
    delegate = createShowStatusDelegateMock();
    uidGenerator = {
      generateBrandedId: jest.fn().mockReturnValue('shst_test123'),
    };
    const txHost = {
      tx: { showStatus: delegate },
    } as unknown as TransactionHost<TransactionalAdapterPrisma>;

    service = new ShowStatusService(
      txHost,
      uidGenerator as unknown as UidGeneratorService,
    );
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a show status with a generated UID', async () => {
    const payload = {
      name: 'Draft',
      metadata: { description: 'Show is in draft status' },
    };
    const expected = createShowStatus({ metadata: payload.metadata });
    delegate.create.mockResolvedValue(expected);

    await expect(service.createShowStatus(payload)).resolves.toEqual(expected);

    expect(uidGenerator.generateBrandedId).toHaveBeenCalledWith(
      'shst',
      undefined,
    );
    expect(delegate.create).toHaveBeenCalledWith({
      data: { ...payload, uid: 'shst_test123' },
    });
  });

  it('propagates persistence conflicts when creation fails', async () => {
    const error = new Error('unique constraint');
    delegate.create.mockRejectedValue(error);

    await expect(
      service.createShowStatus({ name: 'Draft', metadata: {} }),
    ).rejects.toBe(error);
  });

  it('reads an active show status by UID', async () => {
    const expected = createShowStatus();
    delegate.findFirst.mockResolvedValue(expected);

    await expect(
      service.getShowStatusById('shst_test123'),
    ).resolves.toEqual(expected);
    expect(delegate.findFirst).toHaveBeenCalledWith({
      where: { uid: 'shst_test123', deletedAt: null },
    });
  });

  it('returns null when an active show status is not found', async () => {
    delegate.findFirst.mockResolvedValue(null);

    await expect(
      service.getShowStatusById('shst_missing'),
    ).resolves.toBeNull();
  });

  it('reads an active show status by system key', async () => {
    const expected = createShowStatus({
      systemKey: 'CANCELLED_PENDING_RESOLUTION',
    });
    delegate.findFirst.mockResolvedValue(expected);

    await expect(
      service.getShowStatusBySystemKey('CANCELLED_PENDING_RESOLUTION'),
    ).resolves.toEqual(expected);
    expect(delegate.findFirst).toHaveBeenCalledWith({
      where: {
        systemKey: 'CANCELLED_PENDING_RESOLUTION',
        deletedAt: null,
      },
    });
  });

  it('returns null when an active system key is not found', async () => {
    delegate.findFirst.mockResolvedValue(null);

    await expect(
      service.getShowStatusBySystemKey('NOT_A_REAL_KEY'),
    ).resolves.toBeNull();
  });

  it('lists and counts active show statuses with bounded filters', async () => {
    const data = [createShowStatus()];
    delegate.findMany.mockResolvedValue(data);
    delegate.count.mockResolvedValue(1);

    await expect(
      service.getShowStatuses({
        skip: 5,
        take: 10,
        orderBy: 'asc',
        where: { systemKey: { notIn: ['CANCELLED'] } },
      }),
    ).resolves.toEqual({ data, total: 1 });

    const where = {
      systemKey: { notIn: ['CANCELLED'] },
      deletedAt: null,
    };
    expect(delegate.findMany).toHaveBeenCalledWith({
      skip: 5,
      take: 10,
      where,
      orderBy: { createdAt: 'asc' },
    });
    expect(delegate.count).toHaveBeenCalledWith({ where });
  });

  it('counts only active show statuses', async () => {
    delegate.count.mockResolvedValue(5);

    await expect(service.countShowStatuses({})).resolves.toBe(5);
    expect(delegate.count).toHaveBeenCalledWith({
      where: { deletedAt: null },
    });
  });

  it('updates only an active show status', async () => {
    const payload = {
      name: 'Updated Status',
      metadata: { description: 'Updated description' },
    };
    const expected = createShowStatus(payload);
    delegate.update.mockResolvedValue(expected);

    await expect(
      service.updateShowStatus('shst_test123', payload),
    ).resolves.toEqual(expected);
    expect(delegate.update).toHaveBeenCalledWith({
      where: { uid: 'shst_test123', deletedAt: null },
      data: payload,
    });
  });

  it('propagates persistence conflicts when an update fails', async () => {
    const error = new Error('unique constraint');
    delegate.update.mockRejectedValue(error);

    await expect(
      service.updateShowStatus('shst_test123', { name: 'Draft' }),
    ).rejects.toBe(error);
  });

  it('soft-deletes only an active show status', async () => {
    const expected = createShowStatus({ deletedAt: new Date() });
    delegate.update.mockResolvedValue(expected);

    await expect(
      service.deleteShowStatus({ uid: 'shst_test123' }),
    ).resolves.toEqual(expected);
    expect(delegate.update).toHaveBeenCalledWith({
      where: { uid: 'shst_test123', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
