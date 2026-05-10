import { HttpStatus, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { CompensationLineItemTargetType, Prisma } from '@prisma/client';

import type {
  CreateAdminCompensationLineItemPayload,
  ListCompensationLineItemsQuery,
  UpdateCompensationLineItemPayload,
} from './schemas/compensation-line-item.schema';
import { CompensationLineItemRepository } from './compensation-line-item.repository';
import { LineItemTargetResolver, type ResolvedLineItemTarget } from './line-item-target.resolver';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UserService } from '@/models/user/user.service';
import { UtilityService } from '@/utility/utility.service';

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

@Injectable()
export class CompensationLineItemService extends BaseModelService {
  static readonly UID_PREFIX = 'cli';
  protected readonly uidPrefix = CompensationLineItemService.UID_PREFIX;

  constructor(
    private readonly compensationLineItemRepository: CompensationLineItemRepository,
    private readonly targetResolver: LineItemTargetResolver,
    private readonly userService: UserService,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Transactional()
  async createAdminLineItem(
    payload: CreateAdminCompensationLineItemPayload,
    actorExtId: string,
  ) {
    const actor = await this.userService.getUserByExtId(actorExtId);
    if (!actor) {
      throw HttpError.custom('LINE_ITEM_ACTOR_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const resolvedTarget = await this.targetResolver.resolve({
      studioUid: payload.studioId,
      targetType: payload.targetType,
      targetUid: payload.targetUid,
    });

    return this.compensationLineItemRepository.create({
      uid: this.generateUid(),
      amount: payload.amount,
      itemType: payload.itemType,
      reason: payload.reason,
      studio: { connect: { id: resolvedTarget.studioId } },
      createdBy: { connect: { id: actor.id } },
      metadata: this.toJsonObject(payload.metadata ?? {}),
      target: {
        create: this.buildTargetCreate(payload.targetType, resolvedTarget),
      },
    });
  }

  listAdminLineItems(query: ListCompensationLineItemsQuery) {
    return this.compensationLineItemRepository.findPaginated(query);
  }

  getAdminLineItem(uid: string, params?: { includeDeleted?: boolean }) {
    return this.compensationLineItemRepository.findByUidWithRelations(uid, params);
  }

  @Transactional()
  async updateAdminLineItem(
    uid: string,
    payload: UpdateCompensationLineItemPayload,
  ) {
    const existing = await this.compensationLineItemRepository.findByUidWithRelations(uid);
    if (!existing) {
      return null;
    }

    return this.compensationLineItemRepository.updateByUid(uid, {
      ...(payload.amount !== undefined && { amount: payload.amount }),
      ...(payload.itemType !== undefined && { itemType: payload.itemType }),
      ...(payload.reason !== undefined && { reason: payload.reason }),
      ...(payload.metadata !== undefined && {
        metadata: this.toJsonObject(payload.metadata),
      }),
    });
  }

  @Transactional()
  async deleteAdminLineItem(uid: string) {
    const existing = await this.compensationLineItemRepository.findByUidWithRelations(uid);
    if (!existing) {
      return null;
    }

    return this.compensationLineItemRepository.softDeleteByUid(uid);
  }

  private buildTargetCreate(
    targetType: CompensationLineItemTargetType,
    target: ResolvedLineItemTarget,
  ): Prisma.CompensationLineItemTargetCreateWithoutLineItemInput {
    const base = {
      targetType,
      targetId: target.targetId,
    };

    switch (targetType) {
      case CompensationLineItemTargetType.SHOW:
        return { ...base, show: { connect: { id: target.targetId } } };
      case CompensationLineItemTargetType.SHOW_CREATOR:
        return { ...base, showCreator: { connect: { id: target.targetId } } };
      case CompensationLineItemTargetType.STUDIO_SHIFT:
        return { ...base, studioShift: { connect: { id: target.targetId } } };
      case CompensationLineItemTargetType.STUDIO_SHIFT_BLOCK:
        return { ...base, studioShiftBlock: { connect: { id: target.targetId } } };
    }
  }

  private toJsonObject(value: Record<string, unknown>): JsonObject {
    return value as JsonObject;
  }
}
