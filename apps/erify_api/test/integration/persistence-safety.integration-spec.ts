import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import {
  ClsPluginTransactional,
  Transactional,
} from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule, ClsService } from 'nestjs-cls';

import { showStatusDto } from '@/models/show-status/schemas/show-status.schema';
import { ShowStatusModule } from '@/models/show-status/show-status.module';
import { ShowStatusRepository } from '@/models/show-status/show-status.repository';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';

const INTEGRATION_NAME_PREFIX = 'integration-safety:';

@Injectable()
class TransactionProbe {
  constructor(
    private readonly showStatusRepository: ShowStatusRepository,
  ) {}

  @Transactional<TransactionalAdapterPrisma>()
  async createAndRead(uid: string, name: string) {
    await this.showStatusRepository.create({ uid, name, metadata: {} });

    return this.showStatusRepository.findOne({ uid });
  }

  @Transactional<TransactionalAdapterPrisma>()
  async createTwoAndFail(
    first: { uid: string; name: string },
    second: { uid: string; name: string },
  ): Promise<never> {
    await this.showStatusRepository.create({ ...first, metadata: {} });
    await this.showStatusRepository.create({ ...second, metadata: {} });

    throw new Error('integration rollback probe');
  }
}

describe('real database persistence safety', () => {
  let moduleRef: TestingModule;
  let clsService: ClsService;
  let prisma: PrismaService;
  let probe: TransactionProbe;
  let showStatusRepository: ShowStatusRepository;
  let showStatusService: ShowStatusService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
        }),
        ClsModule.forRoot({
          global: true,
          plugins: [
            new ClsPluginTransactional({
              imports: [PrismaModule],
              adapter: new TransactionalAdapterPrisma({
                prismaInjectionToken: PrismaService,
              }),
            }),
          ],
        }),
        ShowStatusModule,
      ],
      providers: [ShowStatusRepository, TransactionProbe],
    }).compile();

    await moduleRef.init();

    clsService = moduleRef.get(ClsService);
    prisma = moduleRef.get(PrismaService);
    probe = moduleRef.get(TransactionProbe);
    showStatusRepository = moduleRef.get(ShowStatusRepository);
    showStatusService = moduleRef.get(ShowStatusService);
  });

  afterEach(async () => {
    await prisma.showStatus.deleteMany({
      where: { name: { startsWith: INTEGRATION_NAME_PREFIX } },
    });
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('preserves shallow CRUD, active-row filtering, and UID-only output', async () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    const created = await showStatusService.createShowStatus({
      name: `${INTEGRATION_NAME_PREFIX}${suffix}`,
      metadata: { source: 'integration-test' },
    });

    const active = await showStatusService.getShowStatusById(created.uid);
    const apiResponse = showStatusDto.parse(active);

    expect(active?.uid).toBe(created.uid);
    expect(apiResponse.id).toBe(created.uid);
    expect(typeof apiResponse.id).toBe('string');
    expect(apiResponse).not.toHaveProperty('uid');

    await showStatusService.deleteShowStatus({ uid: created.uid });

    await expect(
      showStatusService.getShowStatusById(created.uid),
    ).resolves.toBeNull();
  });

  it('reads an earlier write through the ambient transaction', async () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    const uid = `it_shst_read_${suffix}`;
    const name = `${INTEGRATION_NAME_PREFIX}read:${suffix}`;

    const created = await clsService.run(() => probe.createAndRead(uid, name));

    expect(created).toMatchObject({ uid, name });
  });

  it('restores a soft-deleted row through the inherited repository method', async () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    const created = await showStatusService.createShowStatus({
      name: `${INTEGRATION_NAME_PREFIX}restore:${suffix}`,
      metadata: {},
    });

    await showStatusService.deleteShowStatus({ uid: created.uid });

    const deleted = await prisma.showStatus.findUnique({
      where: { uid: created.uid },
    });
    expect(deleted?.deletedAt).toBeInstanceOf(Date);

    await showStatusRepository.restore({ uid: created.uid });

    await expect(
      showStatusService.getShowStatusById(created.uid),
    ).resolves.toMatchObject({ uid: created.uid, deletedAt: null });
  });

  it('rolls back every write when a transactional workflow fails', async () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    const first = {
      uid: `it_shst_rollback_a_${suffix}`,
      name: `${INTEGRATION_NAME_PREFIX}rollback:a:${suffix}`,
    };
    const second = {
      uid: `it_shst_rollback_b_${suffix}`,
      name: `${INTEGRATION_NAME_PREFIX}rollback:b:${suffix}`,
    };

    await expect(
      clsService.run(() => probe.createTwoAndFail(first, second)),
    ).rejects.toThrow('integration rollback probe');

    await expect(
      prisma.showStatus.count({
        where: { uid: { in: [first.uid, second.uid] } },
      }),
    ).resolves.toBe(0);
  });
});
