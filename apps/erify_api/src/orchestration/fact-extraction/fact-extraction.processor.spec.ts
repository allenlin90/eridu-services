import { Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import type { IngestionExtractor } from './extractors/extractor.types';
import { FactExtractionProcessor } from './fact-extraction.processor';

import { AuditService } from '@/models/audit/audit.service';
import { ShowService } from '@/models/show/show.service';
import { PrismaService } from '@/prisma/prisma.service';

// Mock Prisma client wired into the CLS transactional adapter — `@Transactional()`
// in the processor needs a Prisma adapter to resolve a transactional client, but
// the per-fact write+audit path under test never reads Prisma directly (the
// `AuditService` mock and the extractor mock are the only DB-shaped calls).
const mockTransactionClient: Record<string, unknown> = {};
const mockPrismaForCls = {
  $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
    return await callback(mockTransactionClient);
  }),
};

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

function buildExtractor(
  decision: Awaited<ReturnType<IngestionExtractor['apply']>>,
): jest.Mocked<IngestionExtractor> {
  return {
    factKey: 'show_actual_start_time' as IngestionExtractor['factKey'],
    apply: jest.fn().mockResolvedValue(decision),
  } as jest.Mocked<IngestionExtractor>;
}

const fact = {
  contentKey: 'fld_show_start',
  sourceFieldId: 'fld_show_start',
  factKey: 'show_actual_start_time' as const,
  scope: 'show' as const,
  targetUid: 'sho_10',
  rawValue: '2026-05-23T18:30:00.000Z',
};

const ctx = {
  taskId: 99n,
  taskUid: 'task_alpha',
  studioId: 1n,
  showId: 10n,
  showUid: 'sho_10',
  source: 'OPERATOR' as const,
};

const showTargets = [{ targetType: 'SHOW' as const, targetId: 10n }];

describe('factExtractionProcessor', () => {
  let processor: FactExtractionProcessor;
  let auditService: jest.Mocked<AuditService>;
  let showService: jest.Mocked<ShowService>;

  beforeEach(async () => {
    mockPrismaForCls.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      return await callback(mockTransactionClient);
    });

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MockPrismaModule,
        ClsModule.forRoot({
          global: true,
          middleware: { mount: false },
          plugins: [
            new ClsPluginTransactional({
              imports: [MockPrismaModule],
              adapter: new TransactionalAdapterPrisma({
                prismaInjectionToken: PrismaService,
              }),
            }),
          ],
        }),
      ],
      providers: [
        FactExtractionProcessor,
        {
          provide: AuditService,
          useValue: {
            create: jest.fn(async (payload) => ({ uid: `aud_${payload.action}` }) as never),
          },
        },
        {
          provide: ShowService,
          // Default: blank show with no recorded sources. Tests that exercise
          // the paired-actuals path override these mocks directly.
          useValue: {
            getShowById: jest.fn().mockResolvedValue({
              id: 10n,
              uid: 'sho_10',
              metadata: {},
              actualStartTime: null,
              actualEndTime: null,
            } as never),
            updateShow: jest.fn().mockResolvedValue({} as never),
            ensureValidActualTimeRange: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<FactExtractionProcessor>(FactExtractionProcessor);
    auditService = module.get(AuditService);
    showService = module.get(ShowService);
  });

  it('writes a CREATE/UPDATE audit alongside a successful extractor decision', async () => {
    const extractor = buildExtractor({
      kind: 'write',
      action: 'CREATE',
      oldValue: null,
      newValue: '2026-05-23T18:30:00.000Z',
    });

    const result = await processor.applyAndAudit(extractor, fact, ctx, showTargets);

    expect(extractor.apply).toHaveBeenCalledWith(fact, ctx);
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        actorId: null,
        targets: showTargets,
        metadata: expect.objectContaining({
          ingestion_source: 'task_submission',
          task_uid: 'task_alpha',
          fact_key: 'show_actual_start_time',
          old_value: null,
          new_value: '2026-05-23T18:30:00.000Z',
        }),
      }),
    );
    expect(result).toEqual({
      decision: expect.objectContaining({ kind: 'write', action: 'CREATE' }),
      auditUid: 'aud_CREATE',
    });
    // The whole apply+audit ran inside a single CLS transaction.
    expect(mockPrismaForCls.$transaction).toHaveBeenCalledTimes(1);
  });

  it('writes a SKIPPED audit when the extractor reports a lower-priority skip', async () => {
    const extractor = buildExtractor({
      kind: 'skip',
      action: 'SKIPPED_LOWER_PRIORITY',
      skippedBy: 'MANAGER',
      attemptedValue: '2026-05-23T18:30:00.000Z',
    });

    const result = await processor.applyAndAudit(extractor, fact, ctx, showTargets);

    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SKIPPED_LOWER_PRIORITY',
        metadata: expect.objectContaining({
          skipped_by_source: 'MANAGER',
          attempted_value: '2026-05-23T18:30:00.000Z',
        }),
      }),
    );
    expect(result.auditUid).toBe('aud_SKIPPED_LOWER_PRIORITY');
  });

  it('writes no audit when the extractor returns noop', async () => {
    const extractor = buildExtractor({ kind: 'noop', reason: 'value_unchanged' });

    const result = await processor.applyAndAudit(extractor, fact, ctx, showTargets);

    expect(auditService.create).not.toHaveBeenCalled();
    expect(result).toEqual({ decision: { kind: 'noop', reason: 'value_unchanged' } });
  });

  it('writes no audit when no target ids are resolvable (forward compat for unwired scopes)', async () => {
    const extractor = buildExtractor({
      kind: 'write',
      action: 'CREATE',
      oldValue: null,
      newValue: 'x',
    });

    const result = await processor.applyAndAudit(extractor, fact, ctx, []);

    expect(auditService.create).not.toHaveBeenCalled();
    expect(result.auditUid).toBeUndefined();
  });

  it('propagates audit errors so the @Transactional boundary rolls the indexed write back', async () => {
    const extractor = buildExtractor({
      kind: 'write',
      action: 'CREATE',
      oldValue: null,
      newValue: '2026-05-23T18:30:00.000Z',
    });
    auditService.create.mockRejectedValue(new Error('audit insert failed'));

    await expect(processor.applyAndAudit(extractor, fact, ctx, showTargets)).rejects.toThrow(
      'audit insert failed',
    );

    // The extractor ran inside the same TX before audit threw; the rollback
    // is enforced by `@Transactional()` once the audit insert fails.
    expect(extractor.apply).toHaveBeenCalled();
  });

  describe('applyPairedShowActuals', () => {
    const startFact = {
      contentKey: 'fld_show_start',
      sourceFieldId: 'fld_show_start',
      factKey: 'show_actual_start_time' as const,
      scope: 'show' as const,
      targetUid: 'sho_10',
      rawValue: '2026-05-23T12:00:00.000Z',
    };
    const endFact = {
      contentKey: 'fld_show_end',
      sourceFieldId: 'fld_show_end',
      factKey: 'show_actual_end_time' as const,
      scope: 'show' as const,
      targetUid: 'sho_10',
      rawValue: '2026-05-23T13:00:00.000Z',
    };

    function buildPairedInput(overrides: Partial<{
      startIncoming: Date;
      endIncoming: Date;
    }> = {}) {
      return {
        startFact,
        endFact,
        startIncoming: overrides.startIncoming ?? new Date('2026-05-23T12:00:00.000Z'),
        endIncoming: overrides.endIncoming ?? new Date('2026-05-23T13:00:00.000Z'),
        ctx,
        targetIds: showTargets,
      };
    }

    function installEnsureValidImpl() {
      showService.ensureValidActualTimeRange.mockImplementation((
        currentStart: Date | null,
        currentEnd: Date | null,
        dto: { actualStartTime?: Date | null; actualEndTime?: Date | null },
      ) => {
        const next = {
          start: dto.actualStartTime !== undefined ? dto.actualStartTime : currentStart ?? null,
          end: dto.actualEndTime !== undefined ? dto.actualEndTime : currentEnd ?? null,
        };
        if (next.start && next.end && next.end <= next.start) {
          throw new Error('Actual end time must be after actual start time');
        }
      });
    }

    it('writes both columns and both audits in a single updateShow call when both sides pass priority', async () => {
      // Stored 10-11. Paired update 12-13: validation succeeds against the
      // merged pair, and both columns persist via one updateShow.
      installEnsureValidImpl();
      showService.getShowById.mockResolvedValue({
        id: 10n,
        uid: 'sho_10',
        metadata: {},
        actualStartTime: new Date('2026-05-23T10:00:00.000Z'),
        actualEndTime: new Date('2026-05-23T11:00:00.000Z'),
      } as never);

      const result = await processor.applyPairedShowActuals(buildPairedInput());

      expect(showService.updateShow).toHaveBeenCalledTimes(1);
      expect(showService.updateShow).toHaveBeenCalledWith(
        'sho_10',
        expect.objectContaining({
          actualStartTime: new Date('2026-05-23T12:00:00.000Z'),
          actualEndTime: new Date('2026-05-23T13:00:00.000Z'),
          metadata: expect.objectContaining({
            actuals_source: expect.objectContaining({
              show_actual_start_time: 'OPERATOR',
              show_actual_end_time: 'OPERATOR',
            }),
          }),
        }),
      );
      expect(auditService.create).toHaveBeenCalledTimes(2);
      expect(result.start.decision).toMatchObject({ kind: 'write', action: 'UPDATE' });
      expect(result.end.decision).toMatchObject({ kind: 'write', action: 'UPDATE' });
    });

    it('writes only the non-priority-blocked side when MANAGER outranks the incoming source on one column', async () => {
      // Stored end pinned by MANAGER. The paired path must NOT bypass
      // priority — the end side becomes SKIPPED_LOWER_PRIORITY, and the
      // start side validates against the stored (manager-pinned) end.
      installEnsureValidImpl();
      showService.getShowById.mockResolvedValue({
        id: 10n,
        uid: 'sho_10',
        metadata: { actuals_source: { show_actual_end_time: 'MANAGER' } },
        actualStartTime: new Date('2026-05-23T10:00:00.000Z'),
        actualEndTime: new Date('2026-05-23T15:00:00.000Z'),
      } as never);

      const result = await processor.applyPairedShowActuals(buildPairedInput());

      // updateShow contains only the start column — the manager-pinned
      // end is not overwritten by the paired update.
      expect(showService.updateShow).toHaveBeenCalledTimes(1);
      const updateArg = showService.updateShow.mock.calls[0]![1];
      expect(updateArg).toHaveProperty('actualStartTime', new Date('2026-05-23T12:00:00.000Z'));
      expect(updateArg).not.toHaveProperty('actualEndTime');
      expect(result.start.decision).toMatchObject({ kind: 'write', action: 'UPDATE' });
      expect(result.end.decision).toMatchObject({ kind: 'skip', action: 'SKIPPED_LOWER_PRIORITY', skippedBy: 'MANAGER' });
    });

    it('rolls both sides back on validation failure of the merged pair', async () => {
      // Incoming pair itself is invalid (start >= end). `ensureValidActualTimeRange`
      // throws inside the transaction → no updateShow, no audits.
      installEnsureValidImpl();
      showService.getShowById.mockResolvedValue({
        id: 10n,
        uid: 'sho_10',
        metadata: {},
        actualStartTime: null,
        actualEndTime: null,
      } as never);

      await expect(
        processor.applyPairedShowActuals(buildPairedInput({
          startIncoming: new Date('2026-05-23T15:00:00.000Z'),
          endIncoming: new Date('2026-05-23T13:00:00.000Z'),
        })),
      ).rejects.toThrow('Actual end time must be after actual start time');

      expect(showService.updateShow).not.toHaveBeenCalled();
      expect(auditService.create).not.toHaveBeenCalled();
    });

    it('skips the updateShow call entirely when both sides are noop (value_unchanged)', async () => {
      // Stored already matches the incoming pair and the operator wrote it,
      // so both sides resolve to value_unchanged. No DB write, no audits.
      installEnsureValidImpl();
      showService.getShowById.mockResolvedValue({
        id: 10n,
        uid: 'sho_10',
        metadata: {
          actuals_source: {
            show_actual_start_time: 'OPERATOR',
            show_actual_end_time: 'OPERATOR',
          },
        },
        actualStartTime: new Date('2026-05-23T12:00:00.000Z'),
        actualEndTime: new Date('2026-05-23T13:00:00.000Z'),
      } as never);

      const result = await processor.applyPairedShowActuals(buildPairedInput());

      expect(showService.updateShow).not.toHaveBeenCalled();
      expect(auditService.create).not.toHaveBeenCalled();
      expect(result.start.decision).toEqual({ kind: 'noop', reason: 'value_unchanged' });
      expect(result.end.decision).toEqual({ kind: 'noop', reason: 'value_unchanged' });
    });

    it('stays idempotent on resubmission even when the stored pair is already inverted', async () => {
      // Codex P2 review on PR #101: `ensureValidActualTimeRange` was gated
      // on `startCanWrite || endCanWrite`, so a pure resubmission of the
      // recorded values against an inverted stored pair (the `updateShow`
      // path itself does not enforce actual-time ordering, so legacy /
      // out-of-band writes can leave one) would throw and surface as
      // `extractor_error` despite no column update being attempted.
      installEnsureValidImpl();
      showService.getShowById.mockResolvedValue({
        id: 10n,
        uid: 'sho_10',
        metadata: {
          actuals_source: {
            show_actual_start_time: 'OPERATOR',
            show_actual_end_time: 'OPERATOR',
          },
        },
        // Stored pair: end (12:30) is BEFORE start (13:00). Inverted.
        // Incoming pair matches stored exactly — both sides resolve to
        // value_unchanged. No effective write, so validation must be
        // skipped and the operation must stay idempotent.
        actualStartTime: new Date('2026-05-23T13:00:00.000Z'),
        actualEndTime: new Date('2026-05-23T12:30:00.000Z'),
      } as never);

      const result = await processor.applyPairedShowActuals(buildPairedInput({
        startIncoming: new Date('2026-05-23T13:00:00.000Z'),
        endIncoming: new Date('2026-05-23T12:30:00.000Z'),
      }));

      expect(showService.ensureValidActualTimeRange).not.toHaveBeenCalled();
      expect(showService.updateShow).not.toHaveBeenCalled();
      expect(auditService.create).not.toHaveBeenCalled();
      expect(result.start.decision).toEqual({ kind: 'noop', reason: 'value_unchanged' });
      expect(result.end.decision).toEqual({ kind: 'noop', reason: 'value_unchanged' });
    });
  });
});
