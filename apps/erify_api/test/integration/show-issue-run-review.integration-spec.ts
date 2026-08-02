import 'reflect-metadata';

import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { ShowOrchestrationModule } from '@/show-orchestration/show-orchestration.module';
import { ShowRunReviewService } from '@/show-orchestration/show-run-review.service';

const INTEGRATION_NAME_PREFIX = 'integration-show-issue-run-review:';

function uniqueSuffix(): string {
  return `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

/**
 * Real-database proof of the design doc's core Show Run Review contract:
 * "Show Run Review's unresolved count equals the total returned by its
 * issues sub-resource under the same filters." Both the summary badge and
 * the paginated sub-resource run through `ShowIssueRepository.buildWhere` in
 * PostgreSQL (`take`/`skip`/`count`/`groupBy`) — this proves the count/list
 * parity against the real query planner, not a mocked repository.
 * See docs/design/SHOW_ISSUE_OWNERSHIP_DESIGN.md.
 */
describe('real database Show Run Review issue count/list parity', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let showRunReviewService: ShowRunReviewService;

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
        ShowOrchestrationModule,
      ],
    }).compile();

    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    showRunReviewService = moduleRef.get(ShowRunReviewService);
  });

  afterEach(async () => {
    // Cascades show_issues via Show.onDelete: Cascade FK.
    await prisma.show.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.showType.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.showStatus.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.showStandard.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.client.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
    await prisma.studio.deleteMany({ where: { name: { startsWith: INTEGRATION_NAME_PREFIX } } });
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function createFixture(suffix: string) {
    const studio = await prisma.studio.create({
      data: { uid: `studio_it_${suffix}`, name: `${INTEGRATION_NAME_PREFIX}studio:${suffix}`, address: '123 Test St', metadata: {} },
    });
    const client = await prisma.client.create({
      data: {
        uid: `client_it_${suffix}`,
        name: `${INTEGRATION_NAME_PREFIX}client:${suffix}`,
        contactPerson: 'Integration Test',
        contactEmail: `integration-show-issue-run-review-${suffix}@example.com`,
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
        startTime: new Date('2026-08-01T10:00:00.000Z'),
        endTime: new Date('2026-08-01T11:00:00.000Z'),
        client: { connect: { id: client.id } },
        studio: { connect: { id: studio.id } },
        showType: { connect: { id: showType.id } },
        showStatus: { connect: { id: showStatus.id } },
        showStandard: { connect: { id: showStandard.id } },
        metadata: {},
      },
    });
    return { studio, show };
  }

  const range = { date_from: '2026-08-01T00:00:00.000Z', date_to: '2026-08-01T23:59:59.999Z' };

  it('summary unresolved_count equals the issues sub-resource total under the same filters, with a RESOLVED issue excluded from both', async () => {
    const suffix = uniqueSuffix();
    const { studio, show } = await createFixture(suffix);

    await prisma.showIssue.createMany({
      data: [
        { uid: `issue_it_open_${suffix}`, showId: show.id, category: 'EQUIPMENT', origin: 'MANUAL', severity: 'HIGH', status: 'OPEN', title: 'Open issue' },
        { uid: `issue_it_inprog_${suffix}`, showId: show.id, category: 'UTILITY', origin: 'MANUAL', severity: 'CRITICAL', status: 'IN_PROGRESS', title: 'In-progress issue' },
        { uid: `issue_it_resolved_${suffix}`, showId: show.id, category: 'OTHER', origin: 'MANUAL', severity: 'HIGH', status: 'RESOLVED', title: 'Resolved issue', resolvedAt: new Date(), resolutionCode: 'FIXED', resolutionNote: 'done' },
      ],
    });

    const summary = await showRunReviewService.getShowRunReviewSummary(studio.uid, range);
    const issuesRes = await showRunReviewService.getShowRunReviewIssues(studio.uid, range);

    // Both unresolved (OPEN + IN_PROGRESS); the RESOLVED row must not count.
    expect(summary.issues.unresolved_count).toBe(2);
    expect(issuesRes.total).toBe(2);
    expect(summary.issues.unresolved_count).toBe(issuesRes.total);

    expect(summary.issues.unresolved_by_severity).toEqual({ low: 0, medium: 0, high: 1, critical: 1 });

    const returnedUids = issuesRes.items.map((item) => item.id).sort();
    expect(returnedUids).toEqual([`issue_it_inprog_${suffix}`, `issue_it_open_${suffix}`].sort());
    expect(issuesRes.items.every((item) => item.status !== 'RESOLVED')).toBe(true);
  });

  it('an explicit status filter overrides the default unresolved scope and counts/lists agree in PostgreSQL', async () => {
    const suffix = uniqueSuffix();
    const { studio, show } = await createFixture(suffix);

    await prisma.showIssue.createMany({
      data: [
        { uid: `issue_it_open2_${suffix}`, showId: show.id, category: 'EQUIPMENT', origin: 'MANUAL', severity: 'LOW', status: 'OPEN', title: 'Open issue' },
        { uid: `issue_it_resolved2_${suffix}`, showId: show.id, category: 'OTHER', origin: 'MANUAL', severity: 'MEDIUM', status: 'RESOLVED', title: 'Resolved issue', resolvedAt: new Date(), resolutionCode: 'FIXED', resolutionNote: 'done' },
      ],
    });

    const resolvedRes = await showRunReviewService.getShowRunReviewIssues(studio.uid, { ...range, status: 'RESOLVED' });
    expect(resolvedRes.total).toBe(1);
    expect(resolvedRes.items[0].id).toBe(`issue_it_resolved2_${suffix}`);

    const unresolvedRes = await showRunReviewService.getShowRunReviewIssues(studio.uid, range);
    expect(unresolvedRes.total).toBe(1);
    expect(unresolvedRes.items[0].id).toBe(`issue_it_open2_${suffix}`);
  });

  it('paginates the issues sub-resource with real take/skip against PostgreSQL', async () => {
    const suffix = uniqueSuffix();
    const { studio, show } = await createFixture(suffix);

    await prisma.showIssue.createMany({
      data: Array.from({ length: 3 }, (_, i) => ({
        uid: `issue_it_page_${i}_${suffix}`,
        showId: show.id,
        category: 'EQUIPMENT',
        origin: 'MANUAL',
        severity: 'LOW',
        status: 'OPEN',
        title: `Issue ${i}`,
      })),
    });

    const page1 = await showRunReviewService.getShowRunReviewIssues(studio.uid, { ...range, page: 1, limit: 2 });
    const page2 = await showRunReviewService.getShowRunReviewIssues(studio.uid, { ...range, page: 2, limit: 2 });

    expect(page1.total).toBe(3);
    expect(page1.items).toHaveLength(2);
    expect(page2.total).toBe(3);
    expect(page2.items).toHaveLength(1);
  });
});
