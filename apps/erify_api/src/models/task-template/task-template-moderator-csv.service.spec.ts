import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildModeratorCsvMigrationArtifacts, TaskTemplateModeratorCsvService } from './task-template-moderator-csv.service';
import type { TaskTemplateResetExecutionResult, TaskTemplateResetPlan } from './task-template-reset.service';

import type { StudioService } from '@/models/studio/studio.service';
import type { PrismaService } from '@/prisma/prisma.service';

const SAMPLE_CSV = `Brand,Loop,Event,Information,campaign
era-won,Loop1,Live Title,"Data : 1 - 31 Mar 2026",BAU
era-won,Loop1,Data collection,"GMV (e.g., 1,000,000 THB)",BAU
era-won,Loop1,Data collection,Observations,BAU
era-won,Loop2,Data collection,"View (e.g., 9,999)",BAU
era-won,Loop2,Data collection,Review / Feedback,BAU
Pandora Thailand,Loop10,Data collection,"CTR (e.g., 100%)",Double
Pandora Thailand,Loop10,Promotion machenic,"Promo line",Double
`;

const LOOP_ZERO_SETUP_CSV = `Brand,Loop,Event,Information,campaign
LazLive_PJ,Loop0,Server URL,rtmp://push-live.example.com/peacock,BAU
LazLive_PJ,Loop0,stream key,secret-key,BAU
LazLive_PJ,Loop1,Live Title,Title 1,BAU
`;

const INVALID_LOOP_ZERO_CSV = `Brand,Loop,Event,Information,campaign
LazLive_PJ,Loop0,Live Title,Title 1,BAU
`;

function createResetPlan(): TaskTemplateResetPlan {
  return {
    studio: {
      id: BigInt(1),
      uid: 'std_123',
      name: 'Main Studio',
    },
    templates: [
      {
        id: BigInt(11),
        uid: 'ttpl_old',
        name: 'Old Template',
        description: null,
        isActive: true,
        isSoftDeleted: false,
        snapshotCount: 1,
        taskCountTotal: 2,
        taskCountActive: 2,
        boundShowCount: 1,
        lastUsedAt: '2026-03-24T00:00:00.000Z',
      },
    ],
    staleReportDefinitions: [],
    totalTaskCount: 2,
    totalActiveTaskCount: 2,
    totalSnapshotCount: 1,
    canExecute: true,
    taskIdsToDelete: [BigInt(101), BigInt(102)],
    templateIdsToDelete: [BigInt(11)],
  };
}

describe('taskTemplateModeratorCsvService', () => {
  it('builds loop-indexed shared fields and grouped template payloads from moderator CSV', () => {
    const result = buildModeratorCsvMigrationArtifacts(SAMPLE_CSV, 'moderator.csv');

    expect(result.maxLoop).toBe(10);
    expect(result.sharedFields).toHaveLength(80);
    expect(result.sharedFields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'gmv_l1',
        label: 'GMV (Loop 1)',
        type: 'number',
        category: 'metric',
      }),
      expect.objectContaining({
        key: 'ctr_l10',
        label: 'CTR (Loop 10)',
        type: 'number',
        category: 'metric',
      }),
    ]));
    expect(result.templates).toHaveLength(2);
    expect(result.templates.map((template) => template.name)).toEqual([
      'era-won - BAU Moderator Workflow',
      'Pandora Thailand - Double Moderator Workflow',
    ]);

    const eraWonTemplate = result.templates[0];
    expect(eraWonTemplate?.currentSchema.metadata?.loops).toEqual([
      { id: 'l1', name: 'Loop1', durationMin: 15 },
      { id: 'l2', name: 'Loop2', durationMin: 15 },
    ]);
    expect(eraWonTemplate?.currentSchema.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'gmv_l1',
        standard: true,
        group: 'l1',
      }),
      expect.objectContaining({
        key: 'observations_l1',
        standard: true,
        group: 'l1',
      }),
      expect.objectContaining({
        key: 'views_l2',
        standard: true,
        group: 'l2',
      }),
    ]));
  });

  it('keeps rare data-collection labels template-scoped', () => {
    const result = buildModeratorCsvMigrationArtifacts(SAMPLE_CSV, 'moderator.csv');
    const eraWonTemplate = result.templates.find((template) => template.brand === 'era-won');
    const reviewField = eraWonTemplate?.currentSchema.items.find((item) => item.label === 'Review / Feedback');

    expect(result.customDataCollectionLabels).toEqual(['Review / Feedback']);
    expect(reviewField).toEqual(expect.objectContaining({
      label: 'Review / Feedback',
      group: 'l2',
      key: expect.stringMatching(/^l2_data_collection_review_feedback_/),
    }));
    expect(reviewField?.standard).toBeUndefined();
  });

  it('normalizes Loop0 setup rows into the first loop', () => {
    const result = buildModeratorCsvMigrationArtifacts(LOOP_ZERO_SETUP_CSV, 'moderator.csv');
    const template = result.templates[0];

    expect(result.maxLoop).toBe(1);
    expect(template?.currentSchema.metadata?.loops).toEqual([
      { id: 'l1', name: 'Loop1', durationMin: 15 },
    ]);
    expect(template?.currentSchema.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Server URL',
        type: 'url',
        group: 'l1',
      }),
      expect.objectContaining({
        label: 'stream key',
        type: 'text',
        group: 'l1',
      }),
    ]));
  });

  it('rejects Loop0 for non-setup events', () => {
    expect(() => buildModeratorCsvMigrationArtifacts(INVALID_LOOP_ZERO_CSV, 'moderator.csv')).toThrow(
      'CSV row 2 uses Loop0 for unsupported event "Live Title". Only setup events may use Loop0.',
    );
  });

  it('executes shared-field sync, reset, and template recreation in order', async () => {
    const csvPath = join(tmpdir(), `moderator-${Date.now()}.csv`);
    await fs.writeFile(csvPath, SAMPLE_CSV, 'utf-8');

    const prisma = {
      taskTemplate: {
        count: jest.fn().mockResolvedValue(2),
      },
    } as unknown as PrismaService;

    const studioService = {
      getSharedFields: jest.fn().mockResolvedValue([]),
      createSharedField: jest.fn().mockResolvedValue([]),
      updateSharedField: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<StudioService>;

    const taskTemplateService = {
      createTemplateWithSnapshot: jest.fn().mockResolvedValue({ uid: 'ttpl_new' }),
    } as any;

    const resetPlan = createResetPlan();
    const resetResult: TaskTemplateResetExecutionResult = {
      ...resetPlan,
      deletedTaskCount: 2,
      deletedTemplateCount: 1,
    };
    const taskTemplateResetService = {
      planReset: jest.fn().mockResolvedValue(resetPlan),
      executeReset: jest.fn().mockResolvedValue(resetResult),
    } as any;

    const service = new TaskTemplateModeratorCsvService(
      prisma,
      studioService,
      taskTemplateService,
      taskTemplateResetService,
    );

    const result = await service.executeMigration({
      studioUid: 'std_123',
      csvPath,
    });

    expect(taskTemplateResetService.planReset).toHaveBeenCalledWith({
      studioUid: 'std_123',
      allTemplates: true,
    });
    expect(studioService.createSharedField).toHaveBeenCalledWith(
      'std_123',
      expect.objectContaining({ key: 'gmv_l1' }),
    );
    expect(taskTemplateResetService.executeReset).toHaveBeenCalledWith({
      studioUid: 'std_123',
      allTemplates: true,
    });
    expect(taskTemplateService.createTemplateWithSnapshot).toHaveBeenCalledTimes(2);
    expect(result.createdTemplateCount).toBe(2);
    expect(result.createdSharedFieldCount).toBe(80);
    expect(result.resetResult?.deletedTemplateCount).toBe(1);

    await fs.unlink(csvPath);
  });
});
