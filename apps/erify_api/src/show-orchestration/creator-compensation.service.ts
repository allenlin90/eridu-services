import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';

import { decimalLikeToString, isCreatorSnapshotMissing } from './creator-compensation.util';

import { HttpError } from '@/lib/errors/http-error.util';
import { CompensationLineItemService } from '@/models/compensation-line-item/compensation-line-item.service';
import { ShowService } from '@/models/show/show.service';
import { ShowCreatorRepository } from '@/models/show-creator/show-creator.repository';
import { StudioCreatorRepository } from '@/models/studio-creator/studio-creator.repository';

type ShowCreatorCompensationSummaryRow = {
  showCreatorId: string;
  creatorId: string;
  creatorName: string;
  creatorAliasName: string;
  compensationType: string | null;
  agreedRate: string | null;
  commissionRate: string | null;
  baseAmount: string | null;
  adjustmentTotal: string;
  totalAmount: string | null;
  unresolvedReason: string | null;
};

type StudioCreatorCompensationRow = ShowCreatorCompensationSummaryRow & {
  showId: string;
  showName: string;
  showStartTime: Date;
  showEndTime: Date;
  note: string | null;
};

/**
 * Read-side creator-compensation analytics: per-show compensation summaries and
 * per-creator compensation review rows, with the pure resolution/formatting
 * logic the totals are built from. Extracted from `ShowOrchestrationService`;
 * the snapshot-write path keeps its own resolution and shares only the pure
 * `creator-compensation.util` helpers.
 */
@Injectable()
export class CreatorCompensationService {
  constructor(
    private readonly showService: ShowService,
    private readonly compensationLineItemService: CompensationLineItemService,
    private readonly studioCreatorRepository: StudioCreatorRepository,
    private readonly showCreatorRepository: ShowCreatorRepository,
  ) {}

  async getCreatorCompensationSummaryForShow(studioUid: string, uid: string) {
    const show = await this.showService.getShowById(uid, {
      showCreators: {
        where: {
          deletedAt: null,
          creator: { deletedAt: null },
        },
        include: {
          creator: {
            select: {
              uid: true,
              name: true,
              aliasName: true,
            },
          },
        },
      },
    });

    const showCreators = show.showCreators ?? [];
    const adjustmentTotals = await this.compensationLineItemService.sumActiveAmountsByShowCreatorUids({
      studioId: studioUid,
      showCreatorUids: showCreators.map((showCreator) => showCreator.uid),
    });

    const creators: ShowCreatorCompensationSummaryRow[] = [];
    let totalAmount = new Prisma.Decimal(0);
    let unresolvedCount = 0;

    for (const showCreator of showCreators) {
      const adjustmentTotal = adjustmentTotals.get(showCreator.uid) ?? new Prisma.Decimal(0);
      const baseAmount = this.resolveBaseCreatorAmount(
        showCreator.compensationType,
        showCreator.agreedRate,
      );
      const unresolvedReason = this.resolveCreatorCompensationUnresolvedReason(
        showCreator.compensationType,
        showCreator.agreedRate,
        showCreator.commissionRate,
      );
      const rowTotal = unresolvedReason !== null || baseAmount === null
        ? null
        : baseAmount.plus(adjustmentTotal);

      if (rowTotal === null) {
        unresolvedCount += 1;
      } else {
        totalAmount = totalAmount.plus(rowTotal);
      }

      creators.push({
        showCreatorId: showCreator.uid,
        creatorId: showCreator.creator.uid,
        creatorName: showCreator.creator.name,
        creatorAliasName: showCreator.creator.aliasName,
        compensationType: showCreator.compensationType,
        agreedRate: decimalLikeToString(showCreator.agreedRate),
        commissionRate: decimalLikeToString(showCreator.commissionRate),
        baseAmount: baseAmount === null ? null : this.toMoneyString(baseAmount),
        adjustmentTotal: this.toMoneyString(adjustmentTotal),
        totalAmount: rowTotal === null ? null : this.toMoneyString(rowTotal),
        unresolvedReason,
      });
    }

    return {
      showId: uid,
      creators,
      totalAmount: this.toMoneyString(totalAmount),
      unresolvedCount,
    };
  }

  async getCreatorCompensations(
    studioUid: string,
    creatorUid: string,
    params: {
      dateFrom: Date;
      dateTo: Date;
    },
  ) {
    const rosterEntry = await this.studioCreatorRepository.findByStudioUidAndCreatorUid(
      studioUid,
      creatorUid,
    );
    if (!rosterEntry) {
      throw HttpError.notFound('Studio creator', creatorUid);
    }

    const rows = await this.showCreatorRepository.findCompensationReviewRows({
      studioUid,
      creatorUid,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });
    const adjustmentTotals = await this.compensationLineItemService.sumActiveAmountsByShowCreatorUids({
      studioId: studioUid,
      showCreatorUids: rows.map((row) => row.uid),
    });

    const shows: StudioCreatorCompensationRow[] = [];
    let totalAmount = new Prisma.Decimal(0);
    let unresolvedCount = 0;

    for (const row of rows) {
      const adjustmentTotal = adjustmentTotals.get(row.uid) ?? new Prisma.Decimal(0);
      const compensationRow = this.buildCreatorCompensationRow(row, adjustmentTotal);
      const showTotal = compensationRow.totalAmount === null
        ? null
        : new Prisma.Decimal(compensationRow.totalAmount);

      if (showTotal === null) {
        unresolvedCount += 1;
      } else {
        totalAmount = totalAmount.plus(showTotal);
      }

      shows.push({
        ...compensationRow,
        showId: row.show.uid,
        showName: row.show.name,
        showStartTime: row.show.startTime,
        showEndTime: row.show.endTime,
        note: row.note ?? null,
      });
    }

    return {
      creatorId: rosterEntry.creator.uid,
      creatorName: rosterEntry.creator.name,
      creatorAliasName: rosterEntry.creator.aliasName,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      shows,
      totalAmount: this.toMoneyString(totalAmount),
      unresolvedCount,
    };
  }

  private resolveBaseCreatorAmount(
    compensationType: string | null,
    agreedRate: unknown | null,
  ): Prisma.Decimal | null {
    if (
      compensationType === CREATOR_COMPENSATION_TYPE.FIXED
      || compensationType === CREATOR_COMPENSATION_TYPE.HYBRID
    ) {
      return agreedRate == null ? null : this.toDecimal(agreedRate);
    }

    return null;
  }

  private resolveCreatorCompensationUnresolvedReason(
    compensationType: string | null,
    agreedRate: unknown | null,
    commissionRate: unknown | null,
  ): string | null {
    if (isCreatorSnapshotMissing(
      compensationType,
      decimalLikeToString(agreedRate),
      decimalLikeToString(commissionRate),
    )) {
      return 'AGREEMENT_SNAPSHOT_MISSING';
    }

    if (
      compensationType === CREATOR_COMPENSATION_TYPE.COMMISSION
      || compensationType === CREATOR_COMPENSATION_TYPE.HYBRID
    ) {
      return 'COMMISSION_REVENUE_NOT_AVAILABLE';
    }

    return null;
  }

  private buildCreatorCompensationRow(
    showCreator: {
      uid: string;
      compensationType: string | null;
      agreedRate: unknown | null;
      commissionRate: unknown | null;
      creator: {
        uid: string;
        name: string;
        aliasName: string;
      };
    },
    adjustmentTotal: Prisma.Decimal,
  ): ShowCreatorCompensationSummaryRow {
    const baseAmount = this.resolveBaseCreatorAmount(
      showCreator.compensationType,
      showCreator.agreedRate,
    );
    const unresolvedReason = this.resolveCreatorCompensationUnresolvedReason(
      showCreator.compensationType,
      showCreator.agreedRate,
      showCreator.commissionRate,
    );
    const rowTotal = unresolvedReason !== null || baseAmount === null
      ? null
      : baseAmount.plus(adjustmentTotal);

    return {
      showCreatorId: showCreator.uid,
      creatorId: showCreator.creator.uid,
      creatorName: showCreator.creator.name,
      creatorAliasName: showCreator.creator.aliasName,
      compensationType: showCreator.compensationType,
      agreedRate: decimalLikeToString(showCreator.agreedRate),
      commissionRate: decimalLikeToString(showCreator.commissionRate),
      baseAmount: baseAmount === null ? null : this.toMoneyString(baseAmount),
      adjustmentTotal: this.toMoneyString(adjustmentTotal),
      totalAmount: rowTotal === null ? null : this.toMoneyString(rowTotal),
      unresolvedReason,
    };
  }

  private toDecimal(value: unknown): Prisma.Decimal {
    if (value instanceof Prisma.Decimal) {
      return value;
    }

    return new Prisma.Decimal(String(value));
  }

  private toMoneyString(value: Prisma.Decimal): string {
    return value.toFixed(2);
  }
}
