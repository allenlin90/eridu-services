import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';

type CountRow = {
  total_count: bigint;
  pass_count: bigint;
  minor_count: bigint;
  fail_count: bigint;
};

export type SceneQcPeriodTrendRow = CountRow & { operational_date: Date };
export type SceneQcPeriodClientRow = CountRow & { client_id: string; client_name: string };
export type SceneQcPeriodIssueRow = {
  element_key: string;
  element_label: string;
  defect_key: string;
  defect_label: string;
  count: bigint;
};

/**
 * Purpose-shaped historical analytics queries. The latest confirmation
 * revision per day owns scope; the latest result-bearing amendment owns the
 * effective classification. This keeps every report consumer off raw review
 * and finding shapes.
 */
@Injectable()
export class SceneQcPeriodReportQuery {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma>) {}

  async load(input: {
    studioUid: string;
    dateFrom: Date;
    dateTo: Date;
  }): Promise<{
      trend: SceneQcPeriodTrendRow[];
      clients: SceneQcPeriodClientRow[];
      clientTrend: Array<SceneQcPeriodClientRow & { operational_date: Date }>;
      issues: SceneQcPeriodIssueRow[];
    }> {
    const [trend, clients, clientTrend, issues] = await Promise.all([
      this.txHost.tx.$queryRaw<SceneQcPeriodTrendRow[]>(Prisma.sql`
        ${this.effectiveReviewsCte(input)}
        SELECT
          operational_date,
          COUNT(*)::bigint AS total_count,
          COUNT(*) FILTER (WHERE effective_result = 'PASS')::bigint AS pass_count,
          COUNT(*) FILTER (WHERE effective_result = 'MINOR')::bigint AS minor_count,
          COUNT(*) FILTER (WHERE effective_result = 'FAIL')::bigint AS fail_count
        FROM effective_reviews
        GROUP BY operational_date
        ORDER BY operational_date ASC
      `),
      this.txHost.tx.$queryRaw<SceneQcPeriodClientRow[]>(Prisma.sql`
        ${this.effectiveReviewsCte(input)}
        SELECT
          client_uid AS client_id,
          client_name,
          COUNT(*)::bigint AS total_count,
          COUNT(*) FILTER (WHERE effective_result = 'PASS')::bigint AS pass_count,
          COUNT(*) FILTER (WHERE effective_result = 'MINOR')::bigint AS minor_count,
          COUNT(*) FILTER (WHERE effective_result = 'FAIL')::bigint AS fail_count
        FROM effective_reviews
        GROUP BY client_uid, client_name
        ORDER BY fail_count DESC, minor_count DESC, client_name ASC
      `),
      this.txHost.tx.$queryRaw<Array<SceneQcPeriodClientRow & { operational_date: Date }>>(Prisma.sql`
        ${this.effectiveReviewsCte(input)}
        SELECT
          operational_date,
          client_uid AS client_id,
          client_name,
          COUNT(*)::bigint AS total_count,
          COUNT(*) FILTER (WHERE effective_result = 'PASS')::bigint AS pass_count,
          COUNT(*) FILTER (WHERE effective_result = 'MINOR')::bigint AS minor_count,
          COUNT(*) FILTER (WHERE effective_result = 'FAIL')::bigint AS fail_count
        FROM effective_reviews
        GROUP BY operational_date, client_uid, client_name
        ORDER BY operational_date ASC, client_name ASC
      `),
      this.txHost.tx.$queryRaw<SceneQcPeriodIssueRow[]>(Prisma.sql`
        ${this.effectiveReviewsCte(input)}
        SELECT
          COALESCE(af.element_key, rf.element_key) AS element_key,
          COALESCE(af.element_label, rf.element_label) AS element_label,
          COALESCE(af.defect_key, rf.defect_key) AS defect_key,
          COALESCE(af.defect_label, rf.defect_label) AS defect_label,
          COUNT(*)::bigint AS count
        FROM effective_reviews er
        LEFT JOIN scene_qc_review_findings rf
          ON rf.review_id = er.review_id AND er.correction_id IS NULL
        LEFT JOIN scene_qc_review_amendment_findings af
          ON af.amendment_id = er.correction_id
        WHERE er.effective_result <> 'PASS'
          AND COALESCE(af.id, rf.id) IS NOT NULL
        GROUP BY
          COALESCE(af.element_key, rf.element_key),
          COALESCE(af.element_label, rf.element_label),
          COALESCE(af.defect_key, rf.defect_key),
          COALESCE(af.defect_label, rf.defect_label)
        ORDER BY count DESC, element_label ASC, defect_label ASC
      `),
    ]);
    return { trend, clients, clientTrend, issues };
  }

  private effectiveReviewsCte(input: {
    studioUid: string;
    dateFrom: Date;
    dateTo: Date;
  }): Prisma.Sql {
    return Prisma.sql`
      WITH latest_confirmations AS (
        SELECT DISTINCT ON (c.operational_date)
          c.id,
          c.operational_date
        FROM scene_qc_daily_confirmations c
        INNER JOIN studios st ON st.id = c.studio_id
        WHERE st.uid = ${input.studioUid}
          AND c.operational_date BETWEEN ${input.dateFrom} AND ${input.dateTo}
        ORDER BY c.operational_date, c.revision DESC
      ),
      effective_reviews AS (
        SELECT
          i.review_id,
          lc.operational_date,
          i.client_uid,
          i.client_name,
          COALESCE(correction.result, r.result) AS effective_result,
          correction.id AS correction_id
        FROM latest_confirmations lc
        INNER JOIN scene_qc_daily_confirmation_items i ON i.confirmation_id = lc.id
        INNER JOIN scene_qc_reviews r ON r.id = i.review_id
        LEFT JOIN LATERAL (
          SELECT a.id, a.result
          FROM scene_qc_review_amendments a
          WHERE a.review_id = r.id AND a.result IS NOT NULL
          ORDER BY a.revision DESC
          LIMIT 1
        ) correction ON TRUE
      )
    `;
  }
}
