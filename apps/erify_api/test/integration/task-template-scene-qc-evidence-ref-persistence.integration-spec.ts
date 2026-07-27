import 'reflect-metadata';

import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import type { Prisma } from '@prisma/client';
import { ClsModule } from 'nestjs-cls';

import { TaskTemplateModule } from '@/models/task-template/task-template.module';
import { TaskTemplateService } from '@/models/task-template/task-template.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';

const INTEGRATION_NAME_PREFIX = 'integration-scene-qc-evidence-ref:';

function uniqueSuffix(): string {
  return `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

// TASK_TEMPLATE_FIELD_ID_PATTERN (`fld_[a-z0-9]{10,}`) forbids underscores --
// uniqueSuffix()'s `_` separator is not safe to reuse for a field id.
function fieldIdSuffix(suffix: string): string {
  return suffix.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function v2Schema(fieldId: string, label: string, extra: Record<string, unknown> = {}) {
  return {
    schema_version: 2,
    schema_engine: 'task_template_v2',
    items: [
      {
        id: fieldId,
        key: 'scene_photo',
        type: 'file',
        label,
        required: true,
        validation: { accept: 'image/*' },
        evidence_purpose: 'scene_qc',
        ...extra,
      },
    ],
    metadata: { task_type: 'ACTIVE' },
  };
}

describe('real database Scene QC evidence ref persistence', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let taskTemplateService: TaskTemplateService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        ClsModule.forRoot({
          global: true,
          plugins: [
            new ClsPluginTransactional({
              imports: [PrismaModule],
              adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }),
            }),
          ],
        }),
        TaskTemplateModule,
      ],
    }).compile();

    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    taskTemplateService = moduleRef.get(TaskTemplateService);
  });

  afterEach(async () => {
    await prisma.studio.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function createTestStudio(suffix: string) {
    return prisma.studio.create({
      data: {
        uid: `studio_it_${suffix}`,
        name: `${INTEGRATION_NAME_PREFIX}${suffix}`,
        address: '123 Test St',
        metadata: {},
      },
    });
  }

  it('historical snapshot binding durability: a backfilled row on an older snapshot survives a newer snapshot publish', async () => {
    const suffix = uniqueSuffix();
    const studio = await createTestStudio(suffix);
    const fieldId = `fld_${fieldIdSuffix(suffix)}a`;

    const template = await prisma.taskTemplate.create({
      data: {
        uid: `ttpl_it_${suffix}`,
        studio: { connect: { id: studio.id } },
        name: 'Evidence durability template',
        currentSchema: v2Schema(fieldId, 'Scene photo v1'),
        version: 1,
        snapshots: { create: { version: 1, schema: v2Schema(fieldId, 'Scene photo v1') } },
      },
      include: { snapshots: true },
    });
    const oldSnapshot = template.snapshots[0];

    // Simulate the backfill's historical pass: write a ref row for the OLD
    // snapshot directly (never rewriting its schema).
    await prisma.taskTemplateSceneQcEvidenceRef.create({
      data: {
        templateId: template.id,
        snapshotId: oldSnapshot.id,
        fieldKey: fieldId,
        label: 'Scene photo v1 (backfilled)',
      },
    });

    // Publish a NEW snapshot through the real service/repository path.
    await taskTemplateService.updateTemplateWithSnapshot(template.uid, studio.uid, {
      version: 1,
      currentSchema: v2Schema(fieldId, 'Scene photo v2'),
    });

    // The old snapshot's backfilled row must survive untouched: the sync is
    // scoped to (templateId, snapshotId), never touching another snapshot's rows.
    const oldSnapshotRefs = await prisma.taskTemplateSceneQcEvidenceRef.findMany({
      where: { snapshotId: oldSnapshot.id },
    });
    expect(oldSnapshotRefs).toHaveLength(1);
    expect(oldSnapshotRefs[0].label).toBe('Scene photo v1 (backfilled)');

    // And the new snapshot got its own ref row from the real sync.
    const newSnapshot = await prisma.taskTemplateSnapshot.findFirst({
      where: { templateId: template.id, version: 2 },
    });
    expect(newSnapshot).not.toBeNull();
    const newSnapshotRefs = await prisma.taskTemplateSceneQcEvidenceRef.findMany({
      where: { snapshotId: newSnapshot!.id },
    });
    expect(newSnapshotRefs).toHaveLength(1);
    expect(newSnapshotRefs[0].label).toBe('Scene photo v2');
  });

  it('the (snapshot_id, field_key) unique constraint rejects a raw duplicate insert', async () => {
    const suffix = uniqueSuffix();
    const studio = await createTestStudio(suffix);
    const fieldId = `fld_${fieldIdSuffix(suffix)}b`;
    const template = await prisma.taskTemplate.create({
      data: {
        uid: `ttpl_it_${suffix}`,
        studio: { connect: { id: studio.id } },
        name: 'Unique constraint template',
        currentSchema: v2Schema(fieldId, 'Scene photo'),
        version: 1,
        snapshots: { create: { version: 1, schema: v2Schema(fieldId, 'Scene photo') } },
      },
      include: { snapshots: true },
    });
    const snapshot = template.snapshots[0];

    await prisma.taskTemplateSceneQcEvidenceRef.create({
      data: { templateId: template.id, snapshotId: snapshot.id, fieldKey: fieldId, label: 'Scene photo' },
    });

    await expect(
      prisma.taskTemplateSceneQcEvidenceRef.create({
        data: { templateId: template.id, snapshotId: snapshot.id, fieldKey: fieldId, label: 'Scene photo (dup)' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('createMany with skipDuplicates makes a replayed backfill idempotent -- no error, no duplicate row', async () => {
    const suffix = uniqueSuffix();
    const studio = await createTestStudio(suffix);
    const fieldId = `fld_${fieldIdSuffix(suffix)}c`;
    const template = await prisma.taskTemplate.create({
      data: {
        uid: `ttpl_it_${suffix}`,
        studio: { connect: { id: studio.id } },
        name: 'Idempotent backfill template',
        currentSchema: v2Schema(fieldId, 'Scene photo'),
        version: 1,
        snapshots: { create: { version: 1, schema: v2Schema(fieldId, 'Scene photo') } },
      },
      include: { snapshots: true },
    });
    const snapshot = template.snapshots[0];
    const row: Prisma.TaskTemplateSceneQcEvidenceRefCreateManyInput = {
      templateId: template.id,
      snapshotId: snapshot.id,
      fieldKey: fieldId,
      label: 'Scene photo',
    };

    await prisma.taskTemplateSceneQcEvidenceRef.createMany({ data: [row], skipDuplicates: true });
    await expect(
      prisma.taskTemplateSceneQcEvidenceRef.createMany({ data: [row], skipDuplicates: true }),
    ).resolves.not.toThrow();

    const rows = await prisma.taskTemplateSceneQcEvidenceRef.findMany({ where: { snapshotId: snapshot.id } });
    expect(rows).toHaveLength(1);
  });

  it('cascades on template hard-delete', async () => {
    const suffix = uniqueSuffix();
    const studio = await createTestStudio(suffix);
    const fieldId = `fld_${fieldIdSuffix(suffix)}d`;
    const template = await prisma.taskTemplate.create({
      data: {
        uid: `ttpl_it_${suffix}`,
        studio: { connect: { id: studio.id } },
        name: 'Cascade template',
        currentSchema: v2Schema(fieldId, 'Scene photo'),
        version: 1,
        snapshots: { create: { version: 1, schema: v2Schema(fieldId, 'Scene photo') } },
      },
      include: { snapshots: true },
    });
    const snapshot = template.snapshots[0];
    await prisma.taskTemplateSceneQcEvidenceRef.create({
      data: { templateId: template.id, snapshotId: snapshot.id, fieldKey: fieldId, label: 'Scene photo' },
    });

    await prisma.taskTemplate.delete({ where: { id: template.id } });

    await expect(
      prisma.taskTemplateSceneQcEvidenceRef.findMany({ where: { templateId: template.id } }),
    ).resolves.toHaveLength(0);
  });
});
