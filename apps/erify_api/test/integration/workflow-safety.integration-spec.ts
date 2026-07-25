import 'reflect-metadata';

import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule, ClsService } from 'nestjs-cls';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { PublishingService } from '@/schedule-planning/publishing.service';
import { SchedulePlanningModule } from '@/schedule-planning/schedule-planning.module';
import type { CreateShowWithAssignmentsDto } from '@/show-orchestration/schemas/show-orchestration.schema';
import { ShowOrchestrationModule } from '@/show-orchestration/show-orchestration.module';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';

const INTEGRATION_NAME_PREFIX = 'integration-workflow:';
const FAIL_PUBLISH_FUNCTION = 'integration_fail_schedule_publish';
const FAIL_PUBLISH_TRIGGER = 'integration_fail_schedule_publish_trigger';

function uniqueSuffix(): string {
  return `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

describe('real database workflow safety', () => {
  let moduleRef: TestingModule;
  let clsService: ClsService;
  let prisma: PrismaService;
  let publishingService: PublishingService;
  let showOrchestrationService: ShowOrchestrationService;

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
        ShowOrchestrationModule,
        SchedulePlanningModule,
      ],
    }).compile();

    await moduleRef.init();

    clsService = moduleRef.get(ClsService);
    prisma = moduleRef.get(PrismaService);
    publishingService = moduleRef.get(PublishingService, { strict: false });
    showOrchestrationService = moduleRef.get(ShowOrchestrationService, {
      strict: false,
    });
  });

  afterEach(async () => {
    await dropPublishFailureTrigger();
    await prisma.show.deleteMany({
      where: { name: { startsWith: INTEGRATION_NAME_PREFIX } },
    });
    await prisma.publishRun.deleteMany({
      where: {
        schedule: { name: { startsWith: INTEGRATION_NAME_PREFIX } },
      },
    });
    await prisma.schedule.deleteMany({
      where: { name: { startsWith: INTEGRATION_NAME_PREFIX } },
    });
    await prisma.client.deleteMany({
      where: { name: { startsWith: INTEGRATION_NAME_PREFIX } },
    });
    await prisma.showType.deleteMany({
      where: { name: { startsWith: INTEGRATION_NAME_PREFIX } },
    });
    await prisma.showStatus.deleteMany({
      where: { name: { startsWith: INTEGRATION_NAME_PREFIX } },
    });
    await prisma.showStandard.deleteMany({
      where: { name: { startsWith: INTEGRATION_NAME_PREFIX } },
    });
    await prisma.user.deleteMany({
      where: { name: { startsWith: INTEGRATION_NAME_PREFIX } },
    });
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('creates a show through the orchestration capability with UID relations', async () => {
    const suffix = uniqueSuffix();
    const clientUid = `client_it_${suffix}`;
    const showTypeUid = `shtp_it_${suffix}`;
    const showStatusUid = `shst_it_${suffix}`;
    const showStandardUid = `shsd_it_${suffix}`;

    await prisma.client.create({
      data: {
        uid: clientUid,
        name: `${INTEGRATION_NAME_PREFIX}client:${suffix}`,
        contactPerson: 'Integration Test',
        contactEmail: `integration-client-${suffix}@example.com`,
        metadata: {},
      },
    });
    await prisma.showType.create({
      data: {
        uid: showTypeUid,
        name: `${INTEGRATION_NAME_PREFIX}type:${suffix}`,
        metadata: {},
      },
    });
    await prisma.showStatus.create({
      data: {
        uid: showStatusUid,
        name: `${INTEGRATION_NAME_PREFIX}status:${suffix}`,
        metadata: {},
      },
    });
    await prisma.showStandard.create({
      data: {
        uid: showStandardUid,
        name: `${INTEGRATION_NAME_PREFIX}standard:${suffix}`,
        metadata: {},
      },
    });

    const input = {
      clientId: clientUid,
      studioRoomId: undefined,
      studioId: undefined,
      showTypeId: showTypeUid,
      showStatusId: showStatusUid,
      showStandardId: showStandardUid,
      name: `${INTEGRATION_NAME_PREFIX}show:${suffix}`,
      startTime: new Date('2026-08-01T02:00:00.000Z'),
      endTime: new Date('2026-08-01T04:00:00.000Z'),
      actualStartTime: undefined,
      actualEndTime: undefined,
      metadata: { source: 'integration-test' },
      creators: undefined,
      platforms: undefined,
    } satisfies CreateShowWithAssignmentsDto;

    const created = await showOrchestrationService.createShowWithAssignments(
      input,
    );

    expect(created.uid).toMatch(/^show_/);
    expect(created).toMatchObject({
      name: input.name,
      client: { uid: clientUid },
      showType: { uid: showTypeUid },
      showStatus: { uid: showStatusUid },
      showStandard: { uid: showStandardUid },
    });
  });

  it('rolls back a publish run when the final schedule update fails', async () => {
    const suffix = uniqueSuffix();
    const startDate = new Date('2026-08-01T00:00:00.000Z');
    const endDate = new Date('2026-08-31T23:59:59.000Z');
    const user = await prisma.user.create({
      data: {
        uid: `user_it_${suffix}`,
        email: `integration-publisher-${suffix}@example.com`,
        name: `${INTEGRATION_NAME_PREFIX}publisher:${suffix}`,
        metadata: {},
      },
    });
    const schedule = await prisma.schedule.create({
      data: {
        uid: `sch_it_${suffix}`,
        name: `${INTEGRATION_NAME_PREFIX}schedule:${suffix}`,
        startDate,
        endDate,
        status: 'draft',
        version: 1,
        planDocument: {
          metadata: {
            lastEditedBy: user.uid,
            lastEditedAt: new Date().toISOString(),
            totalShows: 0,
            clientName: 'Integration Test',
            dateRange: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
          },
          shows: [],
        },
        metadata: {},
        createdBy: user.id,
      },
    });
    const statusCountBefore = await prisma.showStatus.count({
      where: {
        systemKey: {
          in: ['CANCELLED', 'CANCELLED_PENDING_RESOLUTION'],
        },
      },
    });

    await installPublishFailureTrigger();

    await expect(
      clsService.run(() =>
        publishingService.publish(schedule.uid, schedule.version, user.id),
      ),
    ).rejects.toThrow('integration forced publish failure');

    await expect(
      prisma.schedule.findUniqueOrThrow({ where: { id: schedule.id } }),
    ).resolves.toMatchObject({
      status: 'draft',
      version: 1,
      publishedAt: null,
      publishedBy: null,
    });
    await expect(
      prisma.publishRun.count({ where: { scheduleId: schedule.id } }),
    ).resolves.toBe(0);
    await expect(
      prisma.showStatus.count({
        where: {
          systemKey: {
            in: ['CANCELLED', 'CANCELLED_PENDING_RESOLUTION'],
          },
        },
      }),
    ).resolves.toBe(statusCountBefore);
  });

  async function installPublishFailureTrigger(): Promise<void> {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION ${FAIL_PUBLISH_FUNCTION}()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.status = 'published' THEN
          RAISE EXCEPTION 'integration forced publish failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER ${FAIL_PUBLISH_TRIGGER}
      BEFORE UPDATE ON schedules
      FOR EACH ROW
      EXECUTE FUNCTION ${FAIL_PUBLISH_FUNCTION}()
    `);
  }

  async function dropPublishFailureTrigger(): Promise<void> {
    await prisma.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS ${FAIL_PUBLISH_TRIGGER} ON schedules`,
    );
    await prisma.$executeRawUnsafe(
      `DROP FUNCTION IF EXISTS ${FAIL_PUBLISH_FUNCTION}()`,
    );
  }
});
