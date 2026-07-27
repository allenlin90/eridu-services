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

import { SceneProfileService } from '@/capabilities/scene-qc/scene-profile.service';
import { SceneQcModule } from '@/capabilities/scene-qc/scene-qc.module';
import type { SaveSceneProfilePayload } from '@/capabilities/scene-qc/schemas/scene-profile.schema';
import { sceneProfileDto } from '@/capabilities/scene-qc/schemas/scene-profile.schema';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';

const INTEGRATION_NAME_PREFIX = 'integration-scene-qc:';

function uniqueSuffix(): string {
  return `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function buildSavePayload(overrides: Partial<SaveSceneProfilePayload> = {}): SaveSceneProfilePayload {
  return {
    objectKey: 'scene-profiles/integration/reference.png',
    fileUrl: 'https://cdn.example.com/scene-profiles/integration/reference.png',
    mimeType: 'image/png',
    fileSize: 12345,
    sceneType: 'GRAPHIC_BG',
    ...overrides,
  };
}

@Injectable()
class SceneProfileTransactionProbe {
  constructor(private readonly sceneProfileService: SceneProfileService) {}

  @Transactional<TransactionalAdapterPrisma>()
  async saveAndReadBack(clientUid: string, payload: SaveSceneProfilePayload) {
    await this.sceneProfileService.saveProfileForClient(clientUid, payload);
    return this.sceneProfileService.getActiveProfileForClient(clientUid);
  }

  @Transactional<TransactionalAdapterPrisma>()
  async saveAndFail(clientUid: string, payload: SaveSceneProfilePayload): Promise<never> {
    await this.sceneProfileService.saveProfileForClient(clientUid, payload);
    throw new Error('scene profile rollback probe');
  }
}

describe('real database Scene Profile persistence safety', () => {
  let moduleRef: TestingModule;
  let clsService: ClsService;
  let prisma: PrismaService;
  let sceneProfileService: SceneProfileService;
  let probe: SceneProfileTransactionProbe;
  const createdAuditUids: string[] = [];

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
        SceneQcModule,
      ],
      providers: [SceneProfileTransactionProbe],
    }).compile();

    await moduleRef.init();

    clsService = moduleRef.get(ClsService);
    prisma = moduleRef.get(PrismaService);
    sceneProfileService = moduleRef.get(SceneProfileService);
    probe = moduleRef.get(SceneProfileTransactionProbe);
  });

  afterEach(async () => {
    if (createdAuditUids.length > 0) {
      await prisma.audit.deleteMany({ where: { uid: { in: createdAuditUids } } });
      createdAuditUids.length = 0;
    }
    // Cascades scene_profiles (and, transitively, any scene_qc_audit_targets
    // pointing at them) via the Client -> SceneProfile onDelete: Cascade FK.
    await prisma.client.deleteMany({
      where: { name: { startsWith: INTEGRATION_NAME_PREFIX } },
    });
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function createTestClient(suffix: string) {
    return prisma.client.create({
      data: {
        uid: `client_it_${suffix}`,
        name: `${INTEGRATION_NAME_PREFIX}client:${suffix}`,
        contactPerson: 'Integration Test',
        contactEmail: `integration-scene-qc-${suffix}@example.com`,
        metadata: {},
      },
    });
  }

  async function createTestAudit(suffix: string) {
    const audit = await prisma.audit.create({
      data: {
        uid: `aud_it_${suffix}`,
        action: 'CREATE',
        metadata: {},
      },
    });
    createdAuditUids.push(audit.uid);
    return audit;
  }

  it('rejects a second non-deleted Scene Profile for the same Client via the partial unique index', async () => {
    const suffix = uniqueSuffix();
    const client = await createTestClient(suffix);

    await prisma.sceneProfile.create({
      data: {
        uid: `scprof_it_a_${suffix}`,
        clientId: client.id,
        objectKey: 'k1',
        fileUrl: 'https://cdn.example.com/k1',
        mimeType: 'image/png',
        fileSize: 100,
        sceneType: 'GRAPHIC_BG',
      },
    });

    await expect(
      prisma.sceneProfile.create({
        data: {
          uid: `scprof_it_b_${suffix}`,
          clientId: client.id,
          objectKey: 'k2',
          fileUrl: 'https://cdn.example.com/k2',
          mimeType: 'image/png',
          fileSize: 100,
          sceneType: 'GRAPHIC_BG',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('retire-then-recreate leaves one non-deleted and one soft-deleted row', async () => {
    const suffix = uniqueSuffix();
    const client = await createTestClient(suffix);

    const first = await sceneProfileService.saveProfileForClient(client.uid, buildSavePayload());
    await sceneProfileService.retireProfileForClient(client.uid);
    const second = await sceneProfileService.saveProfileForClient(client.uid, buildSavePayload({ objectKey: 'reference-2.png' }));

    expect(first.uid).not.toBe(second.uid);

    const rows = await prisma.sceneProfile.findMany({ where: { clientId: client.id } });
    expect(rows).toHaveLength(2);
    expect(rows.filter((r) => r.deletedAt === null)).toHaveLength(1);
    expect(rows.filter((r) => r.deletedAt !== null)).toHaveLength(1);

    await expect(
      sceneProfileService.getActiveProfileForClient(client.uid),
    ).resolves.toMatchObject({ uid: second.uid });
  });

  it('returns null from getActiveProfileForClient after retire', async () => {
    const suffix = uniqueSuffix();
    const client = await createTestClient(suffix);

    await sceneProfileService.saveProfileForClient(client.uid, buildSavePayload());
    await sceneProfileService.retireProfileForClient(client.uid);

    await expect(
      sceneProfileService.getActiveProfileForClient(client.uid),
    ).resolves.toBeNull();
  });

  it('lets two different Clients each hold one profile concurrently with no interference', async () => {
    const suffix = uniqueSuffix();
    const clientA = await createTestClient(`${suffix}_a`);
    const clientB = await createTestClient(`${suffix}_b`);

    const profileA = await sceneProfileService.saveProfileForClient(
      clientA.uid,
      buildSavePayload({ objectKey: 'a.png' }),
    );
    const profileB = await sceneProfileService.saveProfileForClient(
      clientB.uid,
      buildSavePayload({ objectKey: 'b.png' }),
    );

    await sceneProfileService.retireProfileForClient(clientA.uid);

    await expect(
      sceneProfileService.getActiveProfileForClient(clientA.uid),
    ).resolves.toBeNull();
    await expect(
      sceneProfileService.getActiveProfileForClient(clientB.uid),
    ).resolves.toMatchObject({ uid: profileB.uid });
    expect(profileA.uid).not.toBe(profileB.uid);
  });

  it('shows the partial unique index with the client_id column and the deleted_at IS NULL predicate in pg_indexes', async () => {
    const rows = await prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes
      WHERE indexname = 'scene_profiles_active_client_key'
    `;

    expect(rows).toHaveLength(1);
    const [{ indexdef }] = rows;
    expect(indexdef).toContain('client_id');
    expect(indexdef.toUpperCase()).toContain('WHERE (DELETED_AT IS NULL)');
  });

  it('rejects a scene_qc_audit_targets row with a null scene_profile_id via the single-target CHECK constraint', async () => {
    const suffix = uniqueSuffix();
    const audit = await createTestAudit(suffix);

    await expect(
      prisma.sceneQcAuditTarget.create({
        data: { auditId: audit.id, sceneProfileId: null },
      }),
    ).rejects.toThrow();
  });

  it('accepts a scene_qc_audit_targets row with a non-null scene_profile_id', async () => {
    const suffix = uniqueSuffix();
    const client = await createTestClient(suffix);
    const audit = await createTestAudit(suffix);

    const profile = await prisma.sceneProfile.create({
      data: {
        uid: `scprof_it_check_${suffix}`,
        clientId: client.id,
        objectKey: 'k',
        fileUrl: 'https://cdn.example.com/k',
        mimeType: 'image/png',
        fileSize: 100,
        sceneType: 'GRAPHIC_BG',
      },
    });

    const target = await prisma.sceneQcAuditTarget.create({
      data: { auditId: audit.id, sceneProfileId: profile.id },
    });

    expect(target.sceneProfileId).toBe(profile.id);
  });

  it('cascades scene_qc_audit_targets on Scene Profile hard-delete while the parent audits row survives', async () => {
    const suffix = uniqueSuffix();
    const client = await createTestClient(suffix);
    const audit = await createTestAudit(suffix);

    const profile = await prisma.sceneProfile.create({
      data: {
        uid: `scprof_it_cascade_${suffix}`,
        clientId: client.id,
        objectKey: 'k',
        fileUrl: 'https://cdn.example.com/k',
        mimeType: 'image/png',
        fileSize: 100,
        sceneType: 'GRAPHIC_BG',
      },
    });
    await prisma.sceneQcAuditTarget.create({
      data: { auditId: audit.id, sceneProfileId: profile.id },
    });

    await prisma.sceneProfile.delete({ where: { id: profile.id } });

    await expect(
      prisma.sceneQcAuditTarget.findMany({ where: { auditId: audit.id } }),
    ).resolves.toHaveLength(0);
    await expect(
      prisma.audit.findUnique({ where: { id: audit.id } }),
    ).resolves.toMatchObject({ uid: audit.uid });
  });

  it('reads its own write through the ambient CLS transaction', async () => {
    const suffix = uniqueSuffix();
    const client = await createTestClient(suffix);

    const readBack = await clsService.run(
      () => probe.saveAndReadBack(client.uid, buildSavePayload()),
    );

    expect(readBack).toMatchObject({ uid: expect.stringMatching(/^scprof_/) });
  });

  it('rolls back a Scene Profile write when the transactional workflow later throws', async () => {
    const suffix = uniqueSuffix();
    const client = await createTestClient(suffix);

    await expect(
      clsService.run(() => probe.saveAndFail(client.uid, buildSavePayload())),
    ).rejects.toThrow('scene profile rollback probe');

    await expect(
      prisma.sceneProfile.count({ where: { clientId: client.id } }),
    ).resolves.toBe(0);
  });

  it('round-trips through sceneProfileDto.parse() with a scprof_-prefixed id and no raw uid/bigint leakage', async () => {
    const suffix = uniqueSuffix();
    const client = await createTestClient(suffix);

    const created = await sceneProfileService.saveProfileForClient(client.uid, buildSavePayload());
    const dto = sceneProfileDto.parse(created);

    expect(dto.id).toMatch(/^scprof_/);
    expect(typeof dto.id).toBe('string');
    expect(dto).not.toHaveProperty('uid');
    expect(dto.client_id).toBe(client.uid);
  });

  it('increments version 1 -> 2 on a version-checked replace and 409s a replayed stale version', async () => {
    const suffix = uniqueSuffix();
    const client = await createTestClient(suffix);

    const created = await sceneProfileService.saveProfileForClient(client.uid, buildSavePayload());
    expect(created.version).toBe(1);

    const replaced = await sceneProfileService.saveProfileForClient(
      client.uid,
      buildSavePayload({ objectKey: 'replaced.png', version: created.version }),
    );
    expect(replaced.version).toBe(2);

    await expect(
      sceneProfileService.saveProfileForClient(
        client.uid,
        buildSavePayload({ objectKey: 'stale.png', version: created.version }),
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});
