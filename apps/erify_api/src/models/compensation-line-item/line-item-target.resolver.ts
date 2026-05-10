import { HttpStatus, Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { CompensationLineItemTargetType } from '@prisma/client';

import { HttpError } from '@/lib/errors/http-error.util';

type ResolveTargetInput = {
  studioUid: string;
  targetType: CompensationLineItemTargetType;
  targetUid: string;
};

type TypedForeignKey =
  | { showId: bigint }
  | { showCreatorId: bigint }
  | { studioShiftId: bigint }
  | { studioShiftBlockId: bigint };

export type ResolvedLineItemTarget = {
  targetId: bigint;
  studioId: bigint;
  studioUid: string;
  typedForeignKey: TypedForeignKey;
};

@Injectable()
export class LineItemTargetResolver {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async resolve(input: ResolveTargetInput): Promise<ResolvedLineItemTarget> {
    switch (input.targetType) {
      case CompensationLineItemTargetType.SHOW:
        return this.resolveShow(input);
      case CompensationLineItemTargetType.SHOW_CREATOR:
        return this.resolveShowCreator(input);
      case CompensationLineItemTargetType.STUDIO_SHIFT:
        return this.resolveStudioShift(input);
      case CompensationLineItemTargetType.STUDIO_SHIFT_BLOCK:
        return this.resolveStudioShiftBlock(input);
    }
  }

  private async resolveShow(input: ResolveTargetInput): Promise<ResolvedLineItemTarget> {
    const show = await this.txHost.tx.show.findFirst({
      where: {
        uid: input.targetUid,
        deletedAt: null,
        studio: { deletedAt: null },
      },
      select: {
        id: true,
        studioId: true,
        studio: { select: { uid: true } },
      },
    });

    return this.assertStudioTarget(input.studioUid, show, (id) => ({ showId: id }));
  }

  private async resolveShowCreator(input: ResolveTargetInput): Promise<ResolvedLineItemTarget> {
    const showCreator = await this.txHost.tx.showCreator.findFirst({
      where: {
        uid: input.targetUid,
        deletedAt: null,
        show: {
          deletedAt: null,
          studio: { deletedAt: null },
        },
      },
      select: {
        id: true,
        show: {
          select: {
            studioId: true,
            studio: { select: { uid: true } },
          },
        },
      },
    });

    return this.assertStudioTarget(
      input.studioUid,
      showCreator
        ? {
            id: showCreator.id,
            studioId: showCreator.show.studioId,
            studio: showCreator.show.studio,
          }
        : null,
      (id) => ({ showCreatorId: id }),
    );
  }

  private async resolveStudioShift(input: ResolveTargetInput): Promise<ResolvedLineItemTarget> {
    const shift = await this.txHost.tx.studioShift.findFirst({
      where: {
        uid: input.targetUid,
        deletedAt: null,
        studio: { deletedAt: null },
      },
      select: {
        id: true,
        studioId: true,
        studio: { select: { uid: true } },
      },
    });

    return this.assertStudioTarget(input.studioUid, shift, (id) => ({
      studioShiftId: id,
    }));
  }

  private async resolveStudioShiftBlock(
    input: ResolveTargetInput,
  ): Promise<ResolvedLineItemTarget> {
    const block = await this.txHost.tx.studioShiftBlock.findFirst({
      where: {
        uid: input.targetUid,
        deletedAt: null,
        shift: {
          deletedAt: null,
          studio: { deletedAt: null },
        },
      },
      select: {
        id: true,
        shift: {
          select: {
            studioId: true,
            studio: { select: { uid: true } },
          },
        },
      },
    });

    return this.assertStudioTarget(
      input.studioUid,
      block
        ? {
            id: block.id,
            studioId: block.shift.studioId,
            studio: block.shift.studio,
          }
        : null,
      (id) => ({ studioShiftBlockId: id }),
    );
  }

  private assertStudioTarget(
    expectedStudioUid: string,
    target: {
      id: bigint;
      studioId: bigint | null;
      studio: { uid: string } | null;
    } | null,
    buildTypedForeignKey: (id: bigint) => TypedForeignKey,
  ): ResolvedLineItemTarget {
    if (!target?.studioId || !target.studio || target.studio.uid !== expectedStudioUid) {
      throw HttpError.custom('LINE_ITEM_TARGET_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return {
      targetId: target.id,
      studioId: target.studioId,
      studioUid: target.studio.uid,
      typedForeignKey: buildTypedForeignKey(target.id),
    };
  }
}
