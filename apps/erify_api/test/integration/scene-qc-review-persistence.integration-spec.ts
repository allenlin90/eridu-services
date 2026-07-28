import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional, Transactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule, ClsService } from 'nestjs-cls';

import { SceneQcModule } from '@/capabilities/scene-qc/scene-qc.module';
import { OPERATIONAL_TIMEZONE, resolveOperationalWindow } from '@/capabilities/scene-qc/scene-qc-operational-window.util';
import { SceneQcWorkflowService } from '@/capabilities/scene-qc/scene-qc-review-workflow.service';
import type { CreateSceneQcReviewPayload, SceneQcReviewMutationContext } from '@/capabilities/scene-qc/schemas/scene-qc-review.schema';
import { StorageService } from '@/lib/storage/storage.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';

const INTEGRATION_NAME_PREFIX = 'integration-scene-qc-review:';
const CDN_BASE = 'https://cdn.example.com';

function uniqueSuffix(): string {
  return `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function fieldIdSuffix(suffix: string): string {
  return suffix.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function v2Schema(fieldId: string, label: string) {
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
      },
    ],
    metadata: { task_type: 'ACTIVE' },
  };
}

// Deterministic stub -- only deriveObjectKeyFromPublicUrl's behavior matters
// to these persistence/transaction tests, not real R2 config.
class FakeStorageService {
  resolvePublicFileUrl(objectKey: string): string {
    return `${CDN_BASE}/${objectKey}`;
  }

  sanitizeActorIdForObjectKey(): string {
    return 'integration';
  }

  async headObject(): Promise<{ contentType: string; contentLength: number }> {
    return { contentType: 'image/png', contentLength: 12345 };
  }

  deriveObjectKeyFromPublicUrl(fileUrl: string): string | null {
    return fileUrl.startsWith(`${CDN_BASE}/`) ? fileUrl.slice(CDN_BASE.length + 1) : null;
  }
}

@Injectable()
class SceneQcReviewTransactionProbe {
  constructor(private readonly workflow: SceneQcWorkflowService) {}

  @Transactional<TransactionalAdapterPrisma>()
  async createAndFail(
    studioUid: string,
    payload: CreateSceneQcReviewPayload,
    context: SceneQcReviewMutationContext,
  ): Promise<never> {
    await this.workflow.createReview(studioUid, payload, context);
    throw new Error('scene qc review rollback probe');
  }
}

describe('real database Scene QC review persistence safety', () => {
  let moduleRef: TestingModule;
  let clsService: ClsService;
  let prisma: PrismaService;
  let workflow: SceneQcWorkflowService;
  let probe: SceneQcReviewTransactionProbe;

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
        SceneQcModule,
      ],
      providers: [SceneQcReviewTransactionProbe],
    })
      .overrideProvider(StorageService)
      .useClass(FakeStorageService)
      .compile();

    await moduleRef.init();

    clsService = moduleRef.get(ClsService);
    prisma = moduleRef.get(PrismaService);
    workflow = moduleRef.get(SceneQcWorkflowService);
    probe = moduleRef.get(SceneQcReviewTransactionProbe);
  });

  afterEach(async () => {
    await prisma.task.deleteMany({ where: { description: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.taskTemplate.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    // Cascades scene_qc_reviews -> scene_qc_review_evidence and
    // scene_qc_audit_targets via each model's onDelete: Cascade FK to Show/Review.
    await prisma.show.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.showType.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.showStatus.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.showStandard.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.client.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.studio.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.audit.deleteMany({ where: { actorId: { not: null }, actor: { email: { startsWith: INTEGRATION_NAME_PREFIX } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: INTEGRATION_NAME_PREFIX } } });
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  const OPERATIONAL_DATE = '2026-08-01';
  const WINDOW = resolveOperationalWindow(OPERATIONAL_DATE, OPERATIONAL_TIMEZONE);

  async function createShowFixture(suffix: string, startTime: Date = new Date(WINDOW.windowStart.getTime() + 60 * 60 * 1000)) {
    const studio = await prisma.studio.create({
      data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '123 Test St', metadata: {} },
    });
    const client = await prisma.client.create({
      data: {
        uid: `client_it_${suffix}`,
        name: `${INTEGRATION_NAME_PREFIX}client:${suffix}`,
        contactPerson: 'Integration Test',
        contactEmail: `integration-scene-qc-review-${suffix}@example.com`,
        metadata: {},
      },
    });
    const showType = await prisma.showType.create({
      data: { uid: `shtp_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}type:${suffix}`, metadata: {} },
    });
    const showStatus = await prisma.showStatus.create({
      data: { uid: `shst_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}status:${suffix}`, metadata: {} },
    });
    const showStandard = await prisma.showStandard.create({
      data: { uid: `shsd_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}standard:${suffix}`, metadata: {} },
    });
    const show = await prisma.show.create({
      data: {
        uid: `show_it_${suffix}`,
        name: `${INTEGRATION_NAME_PREFIX}show:${suffix}`,
        startTime,
        endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
        client: { connect: { id: client.id } },
        studio: { connect: { id: studio.id } },
        showType: { connect: { id: showType.id } },
        showStatus: { connect: { id: showStatus.id } },
        showStandard: { connect: { id: showStandard.id } },
        metadata: {},
      },
    });
    return { studio, client, showType, showStatus, showStandard, show };
  }

  async function createEvidenceTask(
    suffix: string,
    studioId: bigint,
    showId: bigint,
    fieldValue: string,
    label = 'Scene photo',
  ) {
    const fieldId = `fld_${fieldIdSuffix(suffix)}`;
    const schema = v2Schema(fieldId, label);
    const template = await prisma.taskTemplate.create({
      data: {
        uid: `ttpl_it_${suffix}`,
        studio: { connect: { id: studioId } },
        name: `${INTEGRATION_NAME_PREFIX}template:${suffix}`,
        currentSchema: schema,
        version: 1,
        snapshots: { create: { version: 1, schema } },
      },
      include: { snapshots: true },
    });
    const snapshot = template.snapshots[0];
    await prisma.taskTemplateSceneQcEvidenceRef.create({
      data: { templateId: template.id, snapshotId: snapshot.id, fieldKey: fieldId, label },
    });
    const task = await prisma.task.create({
      data: {
        uid: `task_it_${suffix}`,
        description: `${INTEGRATION_NAME_PREFIX}task:${suffix}`,
        type: 'ACTIVE',
        snapshotId: snapshot.id,
        templateId: template.id,
        content: { [fieldId]: fieldValue },
        studioId,
        targets: { create: { targetType: 'SHOW', targetId: showId, showId } },
      },
    });
    return { template, snapshot, task, fieldId };
  }

  async function createUser(suffix: string) {
    const user = await prisma.user.create({
      data: {
        uid: `user_it_${suffix}`,
        extId: `ext_it_${suffix}`,
        email: `${INTEGRATION_NAME_PREFIX}${suffix}@example.com`,
        name: 'Integration Reviewer',
      },
    });
    return { uid: user.uid, extId: user.extId! };
  }

  it('rejects a second review head for the same (showId, operationalDate) via the unique index', async () => {
    const suffix = uniqueSuffix();
    const { show } = await createShowFixture(suffix);
    const user = await createUser(suffix);

    await prisma.sceneQcReview.create({
      data: {
        uid: `scqcr_it_a_${suffix}`,
        show: { connect: { id: show.id } },
        operationalDate: new Date(`${OPERATIONAL_DATE}T00:00:00.000Z`),
        windowStart: WINDOW.windowStart,
        windowEnd: WINDOW.windowEnd,
        timezone: WINDOW.timezone,
        result: 'PASS',
        reviewedBy: { connect: { uid: user.uid } },
        reviewedAt: new Date(),
      },
    });

    await expect(
      prisma.sceneQcReview.create({
        data: {
          uid: `scqcr_it_b_${suffix}`,
          show: { connect: { id: show.id } },
          operationalDate: new Date(`${OPERATIONAL_DATE}T00:00:00.000Z`),
          windowStart: WINDOW.windowStart,
          windowEnd: WINDOW.windowEnd,
          timezone: WINDOW.timezone,
          result: 'PASS',
          reviewedBy: { connect: { uid: user.uid } },
          reviewedAt: new Date(),
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  describe('widened single-target CHECK on scene_qc_audit_targets', () => {
    it('accepts a review-only target row, still accepts a profile-only row, and rejects both-null and both-set', async () => {
      const suffix = uniqueSuffix();
      const { show, client } = await createShowFixture(suffix);
      const user = await createUser(suffix);
      const review = await prisma.sceneQcReview.create({
        data: {
          uid: `scqcr_it_check_${suffix}`,
          show: { connect: { id: show.id } },
          operationalDate: new Date(`${OPERATIONAL_DATE}T00:00:00.000Z`),
          windowStart: WINDOW.windowStart,
          windowEnd: WINDOW.windowEnd,
          timezone: WINDOW.timezone,
          result: 'PASS',
          reviewedBy: { connect: { uid: user.uid } },
          reviewedAt: new Date(),
        },
      });
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
      const audit = await prisma.audit.create({ data: { uid: `aud_it_check_${suffix}`, action: 'CREATE', metadata: {} } });

      const reviewOnly = await prisma.sceneQcAuditTarget.create({
        data: { auditId: audit.id, sceneQcReviewId: review.id },
      });
      expect(reviewOnly.sceneQcReviewId).toBe(review.id);

      const profileOnly = await prisma.sceneQcAuditTarget.create({
        data: { auditId: audit.id, sceneProfileId: profile.id },
      });
      expect(profileOnly.sceneProfileId).toBe(profile.id);

      await expect(
        prisma.sceneQcAuditTarget.create({ data: { auditId: audit.id, sceneProfileId: null, sceneQcReviewId: null } }),
      ).rejects.toThrow();

      await expect(
        prisma.sceneQcAuditTarget.create({
          data: { auditId: audit.id, sceneProfileId: profile.id, sceneQcReviewId: review.id },
        }),
      ).rejects.toThrow();

      await prisma.audit.delete({ where: { id: audit.id } });
    });
  });

  describe('regression guard: the scene_profiles_active_client_key partial index survives this migration', () => {
    it('still exists in pg_indexes after applying the scene_qc_review migration', async () => {
      const rows = await prisma.$queryRaw<{ indexdef: string }[]>`
        SELECT indexdef FROM pg_indexes
        WHERE indexname = 'scene_profiles_active_client_key'
      `;

      expect(rows).toHaveLength(1);
      expect(rows[0].indexdef).toContain('client_id');
      expect(rows[0].indexdef.toUpperCase()).toContain('WHERE (DELETED_AT IS NULL)');
    });
  });

  describe('review save transaction (via SceneQcWorkflowService)', () => {
    it('commits the review head, evidence rows, Audit envelope, and SceneQcAuditTarget junction together', async () => {
      const suffix = uniqueSuffix();
      const { show, studio } = await createShowFixture(suffix);
      const user = await createUser(suffix);
      await createEvidenceTask(suffix, show.studioId!, show.id, `${CDN_BASE}/scene_reference/it/${suffix}/a.png`);

      const created = await workflow.createReview(
        studio.uid,
        { showId: show.uid, operationalDate: OPERATIONAL_DATE, result: 'PASS', feedback: null },
        { actorExtId: user.extId, studioUid: studio.uid },
      );

      const reviewRow = await prisma.sceneQcReview.findUniqueOrThrow({ where: { uid: created.uid } });
      const evidenceRows = await prisma.sceneQcReviewEvidence.findMany({ where: { reviewId: reviewRow.id } });
      const targets = await prisma.sceneQcAuditTarget.findMany({
        where: { sceneQcReviewId: reviewRow.id },
        include: { audit: true },
      });

      expect(evidenceRows).toHaveLength(1);
      expect(targets).toHaveLength(1);
      expect(targets[0].audit.action).toBe('CREATE');

      await prisma.audit.delete({ where: { id: targets[0].auditId } });
    });

    it('rolls back the review head, evidence rows, and Audit/junction together when the enclosing transaction later throws', async () => {
      const suffix = uniqueSuffix();
      const { show, studio } = await createShowFixture(suffix);
      const user = await createUser(suffix);
      await createEvidenceTask(suffix, show.studioId!, show.id, `${CDN_BASE}/scene_reference/it/${suffix}/a.png`);

      await expect(
        clsService.run(() =>
          probe.createAndFail(
            studio.uid,
            { showId: show.uid, operationalDate: OPERATIONAL_DATE, result: 'PASS', feedback: null },
            { actorExtId: user.extId, studioUid: studio.uid },
          ),
        ),
      ).rejects.toThrow('scene qc review rollback probe');

      await expect(prisma.sceneQcReview.count({ where: { showId: show.id } })).resolves.toBe(0);
      await expect(prisma.sceneQcReviewEvidence.count({})).resolves.toBe(0);
      await expect(
        prisma.audit.count({ where: { metadata: { path: ['show_uid'], equals: show.uid } } }),
      ).resolves.toBe(0);
    });

    it('replaces the pinned evidence set on update -- the prior pin is gone and the new pin is read back in the same transaction', async () => {
      const suffix = uniqueSuffix();
      const { show, studio } = await createShowFixture(suffix);
      const user = await createUser(suffix);
      const { task, fieldId } = await createEvidenceTask(
        suffix,
        show.studioId!,
        show.id,
        `${CDN_BASE}/scene_reference/it/${suffix}/original.png`,
      );

      const created = await workflow.createReview(
        studio.uid,
        { showId: show.uid, operationalDate: OPERATIONAL_DATE, result: 'PASS', feedback: null },
        { actorExtId: user.extId, studioUid: studio.uid },
      );
      const originalEvidence = await prisma.sceneQcReviewEvidence.findMany({
        where: { reviewId: (await prisma.sceneQcReview.findUniqueOrThrow({ where: { uid: created.uid } })).id },
      });
      expect(originalEvidence.map((e) => e.fileUrl)).toEqual([`${CDN_BASE}/scene_reference/it/${suffix}/original.png`]);

      // Simulate the underlying Task's submitted image changing before the
      // review is edited (a resubmission through the normal Task form).
      await prisma.task.update({
        where: { id: task.id },
        data: { content: { [fieldId]: `${CDN_BASE}/scene_reference/it/${suffix}/replaced.png` }, version: { increment: 1 } },
      });

      const updated = await workflow.updateReview(
        studio.uid,
        created.uid,
        { result: 'PASS', feedback: null, version: created.version },
        { actorExtId: user.extId, studioUid: studio.uid },
      );

      const reviewRow = await prisma.sceneQcReview.findUniqueOrThrow({ where: { uid: updated.uid } });
      const evidenceAfterUpdate = await prisma.sceneQcReviewEvidence.findMany({ where: { reviewId: reviewRow.id } });

      expect(evidenceAfterUpdate).toHaveLength(1);
      expect(evidenceAfterUpdate[0].fileUrl).toBe(`${CDN_BASE}/scene_reference/it/${suffix}/replaced.png`);

      const targets = await prisma.sceneQcAuditTarget.findMany({ where: { sceneQcReviewId: reviewRow.id } });
      await prisma.audit.deleteMany({ where: { id: { in: targets.map((t) => t.auditId) } } });
    });

    it('a stale expectedVersion on update produces no write and no audit row', async () => {
      const suffix = uniqueSuffix();
      const { show, studio } = await createShowFixture(suffix);
      const user = await createUser(suffix);
      await createEvidenceTask(suffix, show.studioId!, show.id, `${CDN_BASE}/scene_reference/it/${suffix}/a.png`);

      const created = await workflow.createReview(
        studio.uid,
        { showId: show.uid, operationalDate: OPERATIONAL_DATE, result: 'PASS', feedback: null },
        { actorExtId: user.extId, studioUid: studio.uid },
      );
      const beforeReviewRow = await prisma.sceneQcReview.findUniqueOrThrow({ where: { uid: created.uid } });
      const auditCountBefore = await prisma.sceneQcAuditTarget.count({ where: { sceneQcReviewId: beforeReviewRow.id } });

      await expect(
        workflow.updateReview(
          studio.uid,
          created.uid,
          { result: 'MINOR', feedback: 'stale attempt', version: created.version + 1 },
          { actorExtId: user.extId, studioUid: studio.uid },
        ),
      ).rejects.toMatchObject({ status: 409 });

      const afterReviewRow = await prisma.sceneQcReview.findUniqueOrThrow({ where: { uid: created.uid } });
      expect(afterReviewRow.version).toBe(beforeReviewRow.version);
      expect(afterReviewRow.result).toBe('PASS');
      const auditCountAfter = await prisma.sceneQcAuditTarget.count({ where: { sceneQcReviewId: beforeReviewRow.id } });
      expect(auditCountAfter).toBe(auditCountBefore);

      const targets = await prisma.sceneQcAuditTarget.findMany({ where: { sceneQcReviewId: beforeReviewRow.id } });
      await prisma.audit.deleteMany({ where: { id: { in: targets.map((t) => t.auditId) } } });
    });
  });
});
