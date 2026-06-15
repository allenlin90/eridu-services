import { Prisma } from '@prisma/client';

import {
  aggregateShowPlatformPerformance,
  showPlatformHasViewCount,
} from './show-platform-performance';

const viewCountMetadata = { performance_templates: { show_platform_view_count: 'ttpl_1' } };

describe('aggregateShowPlatformPerformance', () => {
  it('sums GMV and views across platforms and averages CTR/CTO', () => {
    const result = aggregateShowPlatformPerformance([
      {
        gmv: new Prisma.Decimal('100.00'),
        viewerCount: 10,
        ctr: new Prisma.Decimal('4.00'),
        cto: new Prisma.Decimal('2.00'),
        metadata: viewCountMetadata,
      },
      {
        gmv: new Prisma.Decimal('25.00'),
        viewerCount: 5,
        ctr: new Prisma.Decimal('8.00'),
        cto: new Prisma.Decimal('4.00'),
        metadata: viewCountMetadata,
      },
    ]);

    expect(result.gmv?.toString()).toBe('125');
    expect(result.views).toBe(15);
    expect(result.ctr?.toString()).toBe('6');
    expect(result.cto?.toString()).toBe('3');
  });

  it('returns null metrics when no platform records them', () => {
    const result = aggregateShowPlatformPerformance([
      { gmv: null, viewerCount: 0, ctr: null, cto: null, metadata: {} },
    ]);

    expect(result.gmv).toBeNull();
    expect(result.views).toBeNull();
    expect(result.ctr).toBeNull();
    expect(result.cto).toBeNull();
  });

  it('ignores view counts on platforms with no recorded view-count fact', () => {
    // `viewerCount` defaults to 0, so an unrecorded platform must not be counted
    // (and a recorded platform with a real 0 still surfaces as a 0 total).
    const result = aggregateShowPlatformPerformance([
      { gmv: null, viewerCount: 999, ctr: null, cto: null, metadata: {} },
      { gmv: null, viewerCount: 7, ctr: null, cto: null, metadata: viewCountMetadata },
    ]);

    expect(result.views).toBe(7);
  });

  it('preserves decimal precision without float drift', () => {
    const result = aggregateShowPlatformPerformance([
      { gmv: new Prisma.Decimal('0.10'), viewerCount: 0, ctr: null, cto: null, metadata: {} },
      { gmv: new Prisma.Decimal('0.20'), viewerCount: 0, ctr: null, cto: null, metadata: {} },
    ]);

    expect(result.gmv?.toString()).toBe('0.3');
  });
});

describe('showPlatformHasViewCount', () => {
  it('is true only when the view-count fact marker is present', () => {
    expect(showPlatformHasViewCount(viewCountMetadata)).toBe(true);
    expect(showPlatformHasViewCount({ performance_templates: { show_platform_gmv: 'x' } })).toBe(false);
    expect(showPlatformHasViewCount({})).toBe(false);
    expect(showPlatformHasViewCount(null)).toBe(false);
  });
});
