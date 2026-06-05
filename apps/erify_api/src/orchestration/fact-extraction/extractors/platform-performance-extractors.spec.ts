import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  PlatformCtoExtractor,
  PlatformCtrExtractor,
  PlatformGmvExtractor,
  PlatformViewCountExtractor,
  POST_PRODUCTION_TEMPLATE_UID,
} from './platform-performance-extractors';

import type { ShowPlatformService } from '@/models/show-platform/show-platform.service';

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
    updatePerformanceMetrics: jest.fn().mockResolvedValue(undefined),
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
  factKey: 'platform_gmv' as const,
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
      expect(showPlatformService.updatePerformanceMetrics).toHaveBeenCalledWith(
        'show_plt_200',
        10n,
        {
          gmv: new Prisma.Decimal(1250.5),
          metadata: {
            performance_templates: {
              platform_gmv: 'ttpl_loop8',
            },
          },
        },
      );
      expect(decision).toEqual({
        kind: 'write',
        action: 'CREATE',
        oldValue: null,
        newValue: '1250.5',
      });
    });

    it('prefers post-production wrap-up and skips lower-priority loop 8 update when post-production exists', async () => {
      const showPlatformService = buildShowPlatformService({
        gmv: new Prisma.Decimal(1500.0),
        metadata: {
          performance_templates: {
            platform_gmv: POST_PRODUCTION_TEMPLATE_UID,
          },
        },
      });
      const extractor = new PlatformGmvExtractor(showPlatformService);

      const decision = await extractor.apply(factGmv, ctx);

      expect(showPlatformService.updatePerformanceMetrics).not.toHaveBeenCalled();
      expect(decision).toEqual({
        kind: 'skip',
        action: 'SKIPPED_LOWER_PRIORITY',
        skippedBy: 'OPERATOR',
        attemptedValue: 1250.5,
      });
    });

    it('overwrites loop 8 recorded metrics when post-production task is completed', async () => {
      const showPlatformService = buildShowPlatformService({
        gmv: new Prisma.Decimal(1250.5),
        metadata: {
          performance_templates: {
            platform_gmv: 'ttpl_loop8',
          },
        },
      });
      const extractor = new PlatformGmvExtractor(showPlatformService);

      const decision = await extractor.apply({ ...factGmv, rawValue: 1600.0 }, postProdCtx);

      expect(showPlatformService.updatePerformanceMetrics).toHaveBeenCalledWith(
        'show_plt_200',
        10n,
        {
          gmv: new Prisma.Decimal(1600.0),
          metadata: {
            performance_templates: {
              platform_gmv: POST_PRODUCTION_TEMPLATE_UID,
            },
          },
        },
      );
      expect(decision).toEqual({
        kind: 'write',
        action: 'UPDATE',
        oldValue: '1250.5',
        newValue: '1600',
      });
    });

    it('returns value_unchanged when value and templateUid match existing', async () => {
      const showPlatformService = buildShowPlatformService({
        gmv: new Prisma.Decimal(1250.5),
        metadata: {
          performance_templates: {
            platform_gmv: 'ttpl_loop8',
          },
        },
      });
      const extractor = new PlatformGmvExtractor(showPlatformService);

      const decision = await extractor.apply(factGmv, ctx);

      expect(showPlatformService.updatePerformanceMetrics).not.toHaveBeenCalled();
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
  });

  describe('platformViewCountExtractor', () => {
    const factViews = {
      contentKey: 'fld_views:platform:show_plt_200',
      sourceFieldId: 'fld_views',
      factKey: 'platform_view_count' as const,
      scope: 'platform' as const,
      targetUid: 'show_plt_200',
      rawValue: 500,
    };

    it('extracts integer viewerCount correctly (non-Decimal)', async () => {
      const showPlatformService = buildShowPlatformService();
      const extractor = new PlatformViewCountExtractor(showPlatformService);

      const decision = await extractor.apply(factViews, ctx);

      expect(showPlatformService.updatePerformanceMetrics).toHaveBeenCalledWith(
        'show_plt_200',
        10n,
        {
          viewerCount: 500,
          metadata: {
            performance_templates: {
              platform_view_count: 'ttpl_loop8',
            },
          },
        },
      );
      expect(decision).toEqual({
        kind: 'write',
        action: 'UPDATE',
        oldValue: '0',
        newValue: '500',
      });
    });
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
          factKey: 'platform_ctr' as const,
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
          factKey: 'platform_cto' as const,
          scope: 'platform' as const,
          targetUid: 'show_plt_200',
          rawValue: '2.45',
        },
        ctx,
      );

      expect(showPlatformService.updatePerformanceMetrics).toHaveBeenCalledWith(
        'show_plt_200',
        10n,
        {
          ctr: new Prisma.Decimal('5.25'),
          metadata: {
            performance_templates: {
              platform_ctr: 'ttpl_loop8',
            },
          },
        },
      );

      expect(showPlatformService.updatePerformanceMetrics).toHaveBeenCalledWith(
        'show_plt_200',
        10n,
        {
          cto: new Prisma.Decimal('2.45'),
          metadata: {
            performance_templates: {
              platform_cto: 'ttpl_loop8',
            },
          },
        },
      );

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
  });
});
