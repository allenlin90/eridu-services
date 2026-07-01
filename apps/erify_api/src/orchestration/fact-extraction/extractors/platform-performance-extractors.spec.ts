import 'reflect-metadata';

import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import {
  PlatformCtoExtractor,
  PlatformCtrExtractor,
  PlatformGmvExtractor,
  PlatformViewCountExtractor,
  POST_PRODUCTION_TEMPLATE_UID,
} from './platform-performance-extractors';

import { ShowPlatformService } from '@/models/show-platform/show-platform.service';

function buildShowPlatformService(overrides: {
  showId?: bigint;
  notFound?: boolean;
  gmv?: Prisma.Decimal | null;
  viewerCount?: number;
  ctr?: Prisma.Decimal | null;
  cto?: Prisma.Decimal | null;
  metadata?: Record<string, any>;
} = {}): jest.Mocked<ShowPlatformService> {
  const service: any = {
    getShowPlatformById: jest.fn().mockResolvedValue({
      id: 200n,
      uid: 'show_plt_200',
      showId: overrides.showId ?? 10n,
      gmv: overrides.gmv ?? null,
      viewerCount: overrides.viewerCount ?? 0,
      ctr: overrides.ctr ?? null,
      cto: overrides.cto ?? null,
      metadata: overrides.metadata ?? {},
    }),
    updatePerformanceMetric: jest.fn().mockResolvedValue('updated'),
  };

  if (overrides.notFound) {
    service.getShowPlatformById.mockRejectedValue(
      new NotFoundException('ShowPlatform not found'),
    );
  }

  return service as jest.Mocked<ShowPlatformService>;
}

const ctx = {
  taskId: 99n,
  taskUid: 'task_alpha',
  studioId: 1n,
  showId: 10n,
  showUid: 'sho_10',
  source: 'OPERATOR' as const,
  templateUid: 'ttpl_loop8',
};

const postProdCtx = {
  ...ctx,
  templateUid: POST_PRODUCTION_TEMPLATE_UID,
};

const factGmv = {
  contentKey: 'fld_gmv:platform:show_plt_200',
  sourceFieldId: 'fld_gmv',
  factKey: 'show_platform_gmv' as const,
  scope: 'platform' as const,
  targetUid: 'show_plt_200',
  rawValue: 1250.5,
};

describe('basePlatformPerformanceExtractor & Subclasses', () => {
  describe('platformGmvExtractor', () => {
    it('extracts and updates platform GMV successfully', async () => {
      const showPlatformService = buildShowPlatformService();
      const extractor = new PlatformGmvExtractor(showPlatformService);

      const decision = await extractor.apply(factGmv, ctx);

      expect(showPlatformService.getShowPlatformById).toHaveBeenCalledWith('show_plt_200');
      expect(showPlatformService.updatePerformanceMetric).toHaveBeenCalledWith({
        uid: 'show_plt_200',
        showId: 10n,
        dbField: 'gmv',
        value: new Prisma.Decimal(1250.5),
        factKey: 'show_platform_gmv',
        source: 'OPERATOR',
        templateUid: 'ttpl_loop8',
        protectedTemplateUid: POST_PRODUCTION_TEMPLATE_UID,
      });
      expect(decision).toEqual({
        kind: 'write',
        action: 'CREATE',
        oldValue: null,
        newValue: '1250.5',
      });
    });

    it('rounds a high-precision string GMV to the column scale (no float round-trip)', async () => {
      const showPlatformService = buildShowPlatformService();
      const extractor = new PlatformGmvExtractor(showPlatformService);

      // 18 significant digits. The `gmv` column is `Decimal(12,2)`, so Postgres
      // rounds to 2 places on write — the extractor must round to the SAME
      // scale up front so the persisted column, the idempotency check, and the
      // audit `newValue` all agree (instead of auditing a precision the column
      // never stored). Decimal rounding still avoids the JS-float truncation
      // that `Number('1250.123456789012345')` would introduce.
      const rawValue = '1250.123456789012345';
      const decision = await extractor.apply({ ...factGmv, rawValue }, ctx);

      expect(showPlatformService.updatePerformanceMetric).toHaveBeenCalledWith({
        uid: 'show_plt_200',
        showId: 10n,
        dbField: 'gmv',
        value: new Prisma.Decimal('1250.12'),
        factKey: 'show_platform_gmv',
        source: 'OPERATOR',
        templateUid: 'ttpl_loop8',
        protectedTemplateUid: POST_PRODUCTION_TEMPLATE_UID,
      });
      expect(decision).toEqual({
        kind: 'write',
        action: 'CREATE',
        oldValue: null,
        newValue: '1250.12',
      });
    });

    it('writes a whitespace-padded numeric GMV string the prefilter accepts', async () => {
      const showPlatformService = buildShowPlatformService();
      const extractor = new PlatformGmvExtractor(showPlatformService);

      // `parseNumberValue` (the value gate AND the orchestrator prefilter)
      // trims and accepts this, so the extractor must not silently noop on the
      // surrounding whitespace that bare `Prisma.Decimal` rejects — otherwise
      // the fact is advertised as a writer yet dropped here.
      const decision = await extractor.apply({ ...factGmv, rawValue: '  1250.50  ' }, ctx);

      expect(showPlatformService.updatePerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({ dbField: 'gmv', value: new Prisma.Decimal('1250.5') }),
      );
      expect(decision).toEqual({
        kind: 'write',
        action: 'CREATE',
        oldValue: null,
        newValue: '1250.5',
      });
    });

    it('treats a rounded resubmission of the recorded value as value_unchanged', async () => {
      const showPlatformService = buildShowPlatformService({
        gmv: new Prisma.Decimal('1250.50'),
        metadata: {
          performance_templates: {
            show_platform_gmv: 'ttpl_loop8',
          },
        },
      });
      const extractor = new PlatformGmvExtractor(showPlatformService);

      // 1250.504 rounds to the stored 1250.50 at column scale, so a re-submit
      // by the same template must noop instead of re-writing.
      const decision = await extractor.apply({ ...factGmv, rawValue: '1250.504' }, ctx);

      expect(showPlatformService.updatePerformanceMetric).not.toHaveBeenCalled();
      expect(decision).toEqual({ kind: 'noop', reason: 'value_unchanged' });
    });

    it.each(['abc', '   ', true, {}])(
      'returns value_absent for non-numeric rawValue %p without touching the DB',
      async (rawValue) => {
        const showPlatformService = buildShowPlatformService();
        const extractor = new PlatformGmvExtractor(showPlatformService);

        const decision = await extractor.apply({ ...factGmv, rawValue }, ctx);

        expect(decision).toEqual({ kind: 'noop', reason: 'value_absent' });
        expect(showPlatformService.getShowPlatformById).not.toHaveBeenCalled();
        expect(showPlatformService.updatePerformanceMetric).not.toHaveBeenCalled();
      },
    );

    it('prefers post-production wrap-up and skips lower-priority loop 8 update when post-production exists', async () => {
      const showPlatformService = buildShowPlatformService({
        gmv: new Prisma.Decimal(1500.0),
        metadata: {
          performance_templates: {
            show_platform_gmv: POST_PRODUCTION_TEMPLATE_UID,
          },
        },
      });
      const extractor = new PlatformGmvExtractor(showPlatformService);

      const decision = await extractor.apply(factGmv, ctx);

      expect(showPlatformService.updatePerformanceMetric).not.toHaveBeenCalled();
      expect(decision).toEqual({
        kind: 'skip',
        action: 'SKIPPED_LOWER_PRIORITY',
        skippedBy: 'OPERATOR',
        attemptedValue: '1250.5',
      });
    });

    it('overwrites loop 8 recorded metrics when post-production task is completed', async () => {
      const showPlatformService = buildShowPlatformService({
        gmv: new Prisma.Decimal(1250.5),
        metadata: {
          performance_templates: {
            show_platform_gmv: 'ttpl_loop8',
          },
        },
      });
      const extractor = new PlatformGmvExtractor(showPlatformService);

      const decision = await extractor.apply({ ...factGmv, rawValue: 1600.0 }, postProdCtx);

      expect(showPlatformService.updatePerformanceMetric).toHaveBeenCalledWith({
        uid: 'show_plt_200',
        showId: 10n,
        dbField: 'gmv',
        value: new Prisma.Decimal(1600.0),
        factKey: 'show_platform_gmv',
        source: 'OPERATOR',
        templateUid: POST_PRODUCTION_TEMPLATE_UID,
        protectedTemplateUid: POST_PRODUCTION_TEMPLATE_UID,
      });
      expect(decision).toEqual({
        kind: 'write',
        action: 'UPDATE',
        oldValue: '1250.5',
        newValue: '1600',
      });
    });

    it('skips a lower-priority write when post-production wins the same-metric race after the read', async () => {
      const showPlatformService = buildShowPlatformService({
        gmv: new Prisma.Decimal(1250.5),
        metadata: {
          performance_templates: {
            show_platform_gmv: 'ttpl_loop8',
          },
        },
      });
      (showPlatformService.updatePerformanceMetric as jest.Mock).mockResolvedValueOnce(
        'blocked_by_higher_priority',
      );
      const extractor = new PlatformGmvExtractor(showPlatformService);

      const decision = await extractor.apply({ ...factGmv, rawValue: 1300.0 }, ctx);

      expect(showPlatformService.updatePerformanceMetric).toHaveBeenCalledWith({
        uid: 'show_plt_200',
        showId: 10n,
        dbField: 'gmv',
        value: new Prisma.Decimal(1300.0),
        factKey: 'show_platform_gmv',
        source: 'OPERATOR',
        templateUid: 'ttpl_loop8',
        protectedTemplateUid: POST_PRODUCTION_TEMPLATE_UID,
      });
      expect(decision).toEqual({
        kind: 'skip',
        action: 'SKIPPED_LOWER_PRIORITY',
        skippedBy: 'OPERATOR',
        attemptedValue: '1300',
      });
    });

    it('skips a lower-priority write when manager provenance wins after the read', async () => {
      const showPlatformService = buildShowPlatformService({
        gmv: new Prisma.Decimal(1250.5),
        metadata: {
          actuals_source: {
            show_platform_gmv: 'OPERATOR',
          },
          performance_templates: {
            show_platform_gmv: 'ttpl_loop8',
          },
        },
      });
      (showPlatformService.updatePerformanceMetric as jest.Mock).mockResolvedValueOnce(
        'blocked_by_higher_priority',
      );
      const extractor = new PlatformGmvExtractor(showPlatformService);

      const decision = await extractor.apply({ ...factGmv, rawValue: 1300.0 }, ctx);

      expect(showPlatformService.updatePerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          factKey: 'show_platform_gmv',
          source: 'OPERATOR',
          value: new Prisma.Decimal(1300.0),
        }),
      );
      expect(decision).toEqual({
        kind: 'skip',
        action: 'SKIPPED_LOWER_PRIORITY',
        skippedBy: 'OPERATOR',
        attemptedValue: '1300',
      });
    });

    it('returns value_unchanged when value and templateUid match existing', async () => {
      const showPlatformService = buildShowPlatformService({
        gmv: new Prisma.Decimal(1250.5),
        metadata: {
          performance_templates: {
            show_platform_gmv: 'ttpl_loop8',
          },
        },
      });
      const extractor = new PlatformGmvExtractor(showPlatformService);

      const decision = await extractor.apply(factGmv, ctx);

      expect(showPlatformService.updatePerformanceMetric).not.toHaveBeenCalled();
      expect(decision).toEqual({
        kind: 'noop',
        reason: 'value_unchanged',
      });
    });

    it('returns target_stale when ShowPlatform showId does not match ctx showId', async () => {
      const showPlatformService = buildShowPlatformService({ showId: 999n });
      const extractor = new PlatformGmvExtractor(showPlatformService);

      const decision = await extractor.apply(factGmv, ctx);

      expect(decision).toEqual({ kind: 'noop', reason: 'target_stale' });
    });

    it('returns target_stale when getShowPlatformById throws NotFoundException', async () => {
      const showPlatformService = buildShowPlatformService({ notFound: true });
      const extractor = new PlatformGmvExtractor(showPlatformService);

      const decision = await extractor.apply(factGmv, ctx);

      expect(decision).toEqual({ kind: 'noop', reason: 'target_stale' });
    });

    it('skips extraction when the metric has a MANAGER actuals_source recorded (manager override)', async () => {
      const showPlatformService = buildShowPlatformService({
        gmv: new Prisma.Decimal(1250.5),
        metadata: {
          actuals_source: {
            show_platform_gmv: 'MANAGER',
          },
        },
      });
      const extractor = new PlatformGmvExtractor(showPlatformService);

      const decision = await extractor.apply(factGmv, ctx);

      expect(showPlatformService.updatePerformanceMetric).not.toHaveBeenCalled();
      expect(decision).toEqual({
        kind: 'skip',
        action: 'SKIPPED_LOWER_PRIORITY',
        skippedBy: 'MANAGER',
        attemptedValue: '1250.5',
      });
    });
  });

  describe('platformViewCountExtractor', () => {
    const factViews = {
      contentKey: 'fld_views:platform:show_plt_200',
      sourceFieldId: 'fld_views',
      factKey: 'show_platform_view_count' as const,
      scope: 'platform' as const,
      targetUid: 'show_plt_200',
      rawValue: 500,
    };

    it('extracts integer viewerCount correctly (non-Decimal)', async () => {
      const showPlatformService = buildShowPlatformService();
      const extractor = new PlatformViewCountExtractor(showPlatformService);

      const decision = await extractor.apply(factViews, ctx);

      expect(showPlatformService.updatePerformanceMetric).toHaveBeenCalledWith({
        uid: 'show_plt_200',
        showId: 10n,
        dbField: 'viewerCount',
        value: 500,
        factKey: 'show_platform_view_count',
        source: 'OPERATOR',
        templateUid: 'ttpl_loop8',
        protectedTemplateUid: POST_PRODUCTION_TEMPLATE_UID,
      });
      expect(decision).toEqual({
        kind: 'write',
        action: 'UPDATE',
        oldValue: '0',
        newValue: '500',
      });
    });

    it.each([12.5, 3_000_000_000])(
      'rejects a non-integer / out-of-Int4-range viewerCount %p as value_out_of_range',
      async (rawValue) => {
        const showPlatformService = buildShowPlatformService();
        const extractor = new PlatformViewCountExtractor(showPlatformService);

        const decision = await extractor.apply({ ...factViews, rawValue }, ctx);

        expect(showPlatformService.updatePerformanceMetric).not.toHaveBeenCalled();
        expect(decision).toEqual({ kind: 'noop', reason: 'value_out_of_range' });
      },
    );
  });

  describe('platformCtrExtractor & PlatformCtoExtractor', () => {
    it('extracts and updates ctr and cto Decimal fields correctly', async () => {
      const showPlatformService = buildShowPlatformService();
      const ctrExtractor = new PlatformCtrExtractor(showPlatformService);
      const ctoExtractor = new PlatformCtoExtractor(showPlatformService);

      const ctrDecision = await ctrExtractor.apply(
        {
          contentKey: 'fld_ctr:platform:show_plt_200',
          sourceFieldId: 'fld_ctr',
          factKey: 'show_platform_ctr' as const,
          scope: 'platform' as const,
          targetUid: 'show_plt_200',
          rawValue: '5.25',
        },
        ctx,
      );

      const ctoDecision = await ctoExtractor.apply(
        {
          contentKey: 'fld_cto:platform:show_plt_200',
          sourceFieldId: 'fld_cto',
          factKey: 'show_platform_cto' as const,
          scope: 'platform' as const,
          targetUid: 'show_plt_200',
          rawValue: '2.45',
        },
        ctx,
      );

      expect(showPlatformService.updatePerformanceMetric).toHaveBeenCalledWith({
        uid: 'show_plt_200',
        showId: 10n,
        dbField: 'ctr',
        value: new Prisma.Decimal('5.25'),
        factKey: 'show_platform_ctr',
        source: 'OPERATOR',
        templateUid: 'ttpl_loop8',
        protectedTemplateUid: POST_PRODUCTION_TEMPLATE_UID,
      });

      expect(showPlatformService.updatePerformanceMetric).toHaveBeenCalledWith({
        uid: 'show_plt_200',
        showId: 10n,
        dbField: 'cto',
        value: new Prisma.Decimal('2.45'),
        factKey: 'show_platform_cto',
        source: 'OPERATOR',
        templateUid: 'ttpl_loop8',
        protectedTemplateUid: POST_PRODUCTION_TEMPLATE_UID,
      });

      expect(ctrDecision).toEqual({
        kind: 'write',
        action: 'CREATE',
        oldValue: null,
        newValue: '5.25',
      });

      expect(ctoDecision).toEqual({
        kind: 'write',
        action: 'CREATE',
        oldValue: null,
        newValue: '2.45',
      });
    });

    it('rejects a ctr value that would overflow the Decimal(5,2) column', async () => {
      const showPlatformService = buildShowPlatformService();
      const extractor = new PlatformCtrExtractor(showPlatformService);

      // ctr is `Decimal(5,2)` → max 999.99. 1000 would raise a Postgres
      // `numeric field overflow` on the write, so it must be rejected up front
      // as an out-of-range noop rather than reaching the DB.
      const decision = await extractor.apply(
        {
          contentKey: 'fld_ctr:platform:show_plt_200',
          sourceFieldId: 'fld_ctr',
          factKey: 'show_platform_ctr' as const,
          scope: 'platform' as const,
          targetUid: 'show_plt_200',
          rawValue: '1000',
        },
        ctx,
      );

      expect(showPlatformService.updatePerformanceMetric).not.toHaveBeenCalled();
      expect(decision).toEqual({ kind: 'noop', reason: 'value_out_of_range' });
    });
  });
});

describe('platform performance extractors — Nest DI wiring (regression)', () => {
  // The unit tests above hand-construct each extractor (`new PlatformGmvExtractor(mock)`),
  // so they pass even when Nest cannot inject `ShowPlatformService`. These tests
  // resolve the extractors through the real DI container instead.
  //
  // Root cause they guard against: a concrete extractor that inherits its base
  // constructor WITHOUT declaring its own emits no `design:paramtypes`, so Nest
  // injects `undefined`. `this.showPlatformService` is then undefined and every
  // write throws (`extractor_error`) and silently noops — which is why platform
  // performance metrics only ever populated via the backfill, never via live
  // extraction. Each concrete extractor must keep its own constructor.
  const extractorClasses = [
    PlatformGmvExtractor,
    PlatformViewCountExtractor,
    PlatformCtrExtractor,
    PlatformCtoExtractor,
  ];

  it.each(extractorClasses)('emits constructor DI metadata: %p', (ExtractorClass) => {
    const paramTypes = Reflect.getMetadata('design:paramtypes', ExtractorClass) as
      | unknown[]
      | undefined;
    expect(paramTypes).toBeDefined();
    expect(paramTypes).toContain(ShowPlatformService);
  });

  it.each(extractorClasses)(
    'injects ShowPlatformService and writes when resolved via Nest DI: %p',
    async (ExtractorClass) => {
      const showPlatformService = buildShowPlatformService();
      const moduleRef = await Test.createTestingModule({
        providers: [
          ExtractorClass,
          { provide: ShowPlatformService, useValue: showPlatformService },
        ],
      }).compile();

      const extractor = moduleRef.get(ExtractorClass);
      const fact = {
        contentKey: 'fld_x:platform:show_plt_200',
        sourceFieldId: 'fld_x',
        factKey: extractor.factKey,
        scope: 'platform' as const,
        targetUid: 'show_plt_200',
        rawValue: 5,
      };

      // Pre-fix, this throws `Cannot read properties of undefined (reading
      // 'getShowPlatformById')` because the dependency was never injected.
      const decision = await extractor.apply(fact as never, postProdCtx);

      expect(showPlatformService.getShowPlatformById).toHaveBeenCalledWith('show_plt_200');
      expect(showPlatformService.updatePerformanceMetric).toHaveBeenCalled();
      expect(decision.kind).toBe('write');

      await moduleRef.close();
    },
  );
});
