/* eslint-disable node/no-process-env */
import 'reflect-metadata';

import { Buffer } from 'node:buffer';
import { performance } from 'node:perf_hooks';

import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { ScheduleModule } from '@/models/schedule/schedule.module';
import { ScheduleService } from '@/models/schedule/schedule.service';
import {
  type BulkCreateScheduleDto,
  bulkCreateScheduleSchema,
  type BulkUpdateScheduleDto,
  bulkUpdateScheduleSchema,
} from '@/models/schedule/schemas/schedule.schema';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';

const BATCH_SIZE = 1_000;
const FAILURE_INDEX = 500;
const NAME_PREFIX = 'integration-bulk-measurement:';
const runMeasurement
  = process.env.ERIFY_API_RUN_BULK_SCHEDULE_MEASUREMENT === '1';
const describeMeasurement = runMeasurement ? describe : describe.skip;

function durationMs(start: number): number {
  return Math.round((performance.now() - start) * 100) / 100;
}

describeMeasurement('bulk schedule maximum measurement', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let scheduleService: ScheduleService;
  let clientUid: string;
  let userUid: string;
  let suffix: string;

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
        ScheduleModule,
      ],
    }).compile();

    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    scheduleService = moduleRef.get(ScheduleService);
    suffix = `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
    clientUid = `client_bulk_measure_${suffix}`;
    userUid = `user_bulk_measure_${suffix}`;

    await prisma.client.create({
      data: {
        uid: clientUid,
        name: `${NAME_PREFIX}client:${suffix}`,
        contactPerson: 'Integration Measurement',
        contactEmail: `bulk-${suffix}@example.com`,
        metadata: {},
      },
    });
    await prisma.user.create({
      data: {
        uid: userUid,
        email: `bulk-${suffix}@example.com`,
        name: `${NAME_PREFIX}user:${suffix}`,
        metadata: {},
      },
    });
  });

  afterAll(async () => {
    await prisma?.schedule.deleteMany({
      where: { name: { startsWith: NAME_PREFIX } },
    });
    await prisma?.client.deleteMany({ where: { uid: clientUid } });
    await prisma?.user.deleteMany({ where: { uid: userUid } });
    await moduleRef?.close();
  });

  it(
    'measures the 1,000-item create/update paths and preserves ordered partial success',
    async () => {
      const createWirePayload = {
        schedules: Array.from({ length: BATCH_SIZE }, (_, index) => ({
          name: `${NAME_PREFIX}create:${suffix}:${index}`,
          start_date: '2026-08-01T00:00:00.000Z',
          end_date: '2026-08-31T23:59:59.000Z',
          client_id:
            index === FAILURE_INDEX
              ? `client_missing_${suffix}`
              : clientUid,
          created_by: userUid,
          plan_document: { shows: [] },
          metadata: { measurement_index: index },
        })),
      };
      const createDto = bulkCreateScheduleSchema.parse(
        createWirePayload,
      ) as BulkCreateScheduleDto;

      const createStartedAt = performance.now();
      const createResult = await scheduleService.bulkCreateSchedules(
        createDto,
        {
          client: true,
          studio: true,
          createdByUser: true,
          publishedByUser: true,
        },
      );
      const createDurationMs = durationMs(createStartedAt);

      expect(createResult).toMatchObject({
        total: BATCH_SIZE,
        successful: BATCH_SIZE - 1,
        failed: 1,
      });
      expect(createResult.results[FAILURE_INDEX]).toMatchObject({
        index: FAILURE_INDEX,
        success: false,
      });
      expect(createResult.results[FAILURE_INDEX + 1]).toMatchObject({
        index: FAILURE_INDEX + 1,
        success: true,
      });

      const updateWirePayload = {
        schedules: createResult.results.map((row, index) => ({
          schedule_id:
            row.schedule_id ?? `schedule_missing_measurement_${suffix}`,
          name: `${NAME_PREFIX}updated:${suffix}:${index}`,
          version: 1,
        })),
      };
      const updateDto = bulkUpdateScheduleSchema.parse(
        updateWirePayload,
      ) as BulkUpdateScheduleDto;

      const updateStartedAt = performance.now();
      const updateResult = await scheduleService.bulkUpdateSchedules(
        updateDto,
        {
          client: true,
          studio: true,
          createdByUser: true,
          publishedByUser: true,
        },
      );
      const updateDurationMs = durationMs(updateStartedAt);

      expect(updateResult).toMatchObject({
        total: BATCH_SIZE,
        successful: BATCH_SIZE - 1,
        failed: 1,
      });
      expect(updateResult.results[FAILURE_INDEX]).toMatchObject({
        index: FAILURE_INDEX,
        success: false,
        error_code: 'NOT_FOUND',
      });
      expect(updateResult.results[FAILURE_INDEX + 1]).toMatchObject({
        index: FAILURE_INDEX + 1,
        success: true,
      });
      await expect(
        prisma.schedule.findUnique({
          where: {
            uid: updateResult.results.at(-1)?.schedule_id ?? '',
          },
          select: { name: true },
        }),
      ).resolves.toEqual({
        name: `${NAME_PREFIX}updated:${suffix}:${BATCH_SIZE - 1}`,
      });

      process.stdout.write(
        `BULK_SCHEDULE_MEASUREMENT ${JSON.stringify({
          batch_size: BATCH_SIZE,
          failure_index: FAILURE_INDEX,
          create: {
            duration_ms: createDurationMs,
            successful: createResult.successful,
            failed: createResult.failed,
            request_bytes: Buffer.byteLength(
              JSON.stringify(createWirePayload),
            ),
          },
          update: {
            duration_ms: updateDurationMs,
            successful: updateResult.successful,
            failed: updateResult.failed,
            request_bytes: Buffer.byteLength(
              JSON.stringify(updateWirePayload),
            ),
          },
        })}\n`,
      );
    },
    120_000,
  );
});
