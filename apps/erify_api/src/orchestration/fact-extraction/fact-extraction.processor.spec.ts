import { Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import type { IngestionExtractor } from './extractors/extractor.types';
import { FactExtractionProcessor } from './fact-extraction.processor';

import { AuditService } from '@/models/audit/audit.service';
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
      ],
    }).compile();

    processor = module.get<FactExtractionProcessor>(FactExtractionProcessor);
    auditService = module.get(AuditService);
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
});
