import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import type { SceneQcResult as PrismaSceneQcResult } from '@prisma/client';
import { Prisma } from '@prisma/client';

import type { ReviewRecordRow } from './schemas/scene-qc-records.schema';

type RecordsInput = {
  studioUid: string;
  operationalDateFrom: Date;
  operationalDateTo: Date;
  clientUid?: string;
  platformUid?: string;
  result?: PrismaSceneQcResult;
};

/** Private, purpose-shaped Records list query with effective amendment semantics. */
@Injectable()
export class SceneQcRecordsQuery {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma>) {}

  async findReviewRecords(input: RecordsInput & { skip: number; take: number }): Promise<ReviewRecordRow[]> {
    const effectiveIds = input.result
      ? await this.findEffectiveRecordIds({ ...input, result: input.result })
      : null;
    if (effectiveIds && effectiveIds.length === 0)
      return [];

    const reviews = await this.txHost.tx.sceneQcReview.findMany({
      where: effectiveIds
        ? { id: { in: effectiveIds }, show: { deletedAt: null, studio: { uid: input.studioUid } } }
        : this.buildRecordsWhere(input),
      select: {
        id: true,
        uid: true,
        operationalDate: true,
        result: true,
        feedback: true,
        version: true,
        reviewedBy: { select: { uid: true, name: true } },
        reviewedAt: true,
        amendments: {
          where: { result: { not: null } },
          orderBy: { revision: 'desc' },
          take: 1,
          select: { result: true },
        },
        show: {
          select: {
            uid: true,
            name: true,
            startTime: true,
            client: { select: { uid: true, name: true } },
            showPlatforms: {
              where: { deletedAt: null },
              select: { platform: { select: { uid: true, name: true } } },
            },
          },
        },
        _count: { select: { evidence: true, amendments: true } },
      },
      orderBy: [{ operationalDate: 'desc' }, { reviewedAt: 'desc' }],
      ...(effectiveIds ? {} : { skip: input.skip, take: input.take }),
    });

    const rows = reviews.map((review) => ({
      id: review.id,
      uid: review.uid,
      operationalDate: review.operationalDate,
      showUid: review.show.uid,
      showName: review.show.name,
      scheduledStartTime: review.show.startTime,
      client: review.show.client,
      platforms: review.show.showPlatforms.map((entry) => entry.platform),
      result: review.result,
      effectiveResult: review.amendments[0]?.result ?? review.result,
      amendmentCount: review._count.amendments,
      feedback: review.feedback,
      reviewedBy: review.reviewedBy,
      reviewedAt: review.reviewedAt,
      version: review.version,
      evidenceCount: review._count.evidence,
    }));
    if (!effectiveIds)
      return rows;
    const order = new Map(effectiveIds.map((id, index) => [id, index]));
    return rows.sort((left, right) => order.get(left.id)! - order.get(right.id)!);
  }

  async countReviewRecords(input: RecordsInput): Promise<number> {
    if (!input.result) {
      return this.txHost.tx.sceneQcReview.count({ where: this.buildRecordsWhere(input) });
    }
    const [row] = await this.txHost.tx.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      ${this.effectiveRecordsFrom(input)}
      AND COALESCE(correction.result, r.result) = CAST(${input.result} AS "SceneQcResult")
    `);
    return Number(row?.count ?? 0n);
  }

  private buildRecordsWhere(input: RecordsInput): Prisma.SceneQcReviewWhereInput {
    return {
      operationalDate: { gte: input.operationalDateFrom, lte: input.operationalDateTo },
      show: {
        deletedAt: null,
        studio: { uid: input.studioUid },
        ...(input.clientUid ? { client: { uid: input.clientUid } } : {}),
        ...(input.platformUid
          ? { showPlatforms: { some: { deletedAt: null, platform: { uid: input.platformUid } } } }
          : {}),
      },
    };
  }

  private async findEffectiveRecordIds(
    input: RecordsInput & { result: PrismaSceneQcResult; skip: number; take: number },
  ): Promise<bigint[]> {
    const rows = await this.txHost.tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT r.id
      ${this.effectiveRecordsFrom(input)}
      AND COALESCE(correction.result, r.result) = CAST(${input.result} AS "SceneQcResult")
      ORDER BY r.operational_date DESC, r.reviewed_at DESC
      OFFSET ${input.skip}
      LIMIT ${input.take}
    `);
    return rows.map((row) => row.id);
  }

  private effectiveRecordsFrom(input: RecordsInput): Prisma.Sql {
    return Prisma.sql`
      FROM scene_qc_reviews r
      INNER JOIN shows s ON s.id = r.show_id
      INNER JOIN studios st ON st.id = s.studio_id
      INNER JOIN clients c ON c.id = s.client_id
      LEFT JOIN LATERAL (
        SELECT a.result
        FROM scene_qc_review_amendments a
        WHERE a.review_id = r.id AND a.result IS NOT NULL
        ORDER BY a.revision DESC
        LIMIT 1
      ) correction ON TRUE
      WHERE st.uid = ${input.studioUid}
        AND s.deleted_at IS NULL
        AND r.operational_date BETWEEN ${input.operationalDateFrom} AND ${input.operationalDateTo}
        ${input.clientUid ? Prisma.sql`AND c.uid = ${input.clientUid}` : Prisma.empty}
        ${input.platformUid
          ? Prisma.sql`
              AND EXISTS (
                SELECT 1
                FROM show_platforms sp
                INNER JOIN platforms p ON p.id = sp.platform_id
                WHERE sp.show_id = s.id
                  AND sp.deleted_at IS NULL
                  AND p.uid = ${input.platformUid}
              )
            `
          : Prisma.empty}
    `;
  }
}
