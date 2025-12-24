import { Injectable } from '@nestjs/common';
import { Prisma, StudioMembership } from '@prisma/client';

import {
  CreateStudioMembershipDto,
  UpdateStudioMembershipDto,
} from './schemas/studio-membership.schema';
import { StudioMembershipRepository } from './studio-membership.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

// Type aliases for better readability and type safety
type UserId = Prisma.UserWhereUniqueInput['id'];
type StudioId = bigint;
type StudioMembershipId = Prisma.StudioMembershipWhereUniqueInput['id'];

type StudioMembershipWithIncludes<T extends Prisma.StudioMembershipInclude> =
  Prisma.StudioMembershipGetPayload<{
    include: T;
  }>;

@Injectable()
export class StudioMembershipService extends BaseModelService {
  static readonly UID_PREFIX = 'smb';
  protected readonly uidPrefix = StudioMembershipService.UID_PREFIX;

  constructor(
    private readonly studioMembershipRepository: StudioMembershipRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createStudioMembershipFromDto<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    dto: CreateStudioMembershipDto,
    include?: T,
  ): Promise<StudioMembership | StudioMembershipWithIncludes<T>> {
    const data = this.buildCreatePayload(dto);
    return this.createStudioMembership(data, include);
  }

  async createStudioMembership<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    data: Omit<Prisma.StudioMembershipCreateInput, 'uid'>,
    include?: T,
  ): Promise<StudioMembership | StudioMembershipWithIncludes<T>> {
    const uid = this.generateUid();
    return this.studioMembershipRepository.createStudioMembership(
      { ...data, uid },
      include,
    );
  }

  async getStudioMembershipById<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    uid: string,
    include?: T,
  ): Promise<StudioMembership | StudioMembershipWithIncludes<T>> {
    return this.findStudioMembershipOrThrow(uid, include);
  }

  async getStudioMembershipsByStudio(
    studioId: StudioId,
  ): Promise<StudioMembership[]> {
    return this.studioMembershipRepository.findStudioMembershipsByStudio({
      studioId,
    });
  }

  async getUserStudioMemberships<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    userId: UserId,
    include?: T,
  ): Promise<StudioMembership[] | StudioMembershipWithIncludes<T>[]> {
    return this.studioMembershipRepository.findUserStudioMemberships(
      userId,
      include,
    );
  }

  async getStudioMemberships<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    params: {
      skip: number;
      take: number;
    },
    include?: T,
  ): Promise<StudioMembership[] | StudioMembershipWithIncludes<T>[]> {
    return this.studioMembershipRepository.findMany({
      skip: params.skip,
      take: params.take,
      include,
    });
  }

  async countStudioMemberships(
    where: Prisma.StudioMembershipWhereInput = {},
  ): Promise<number> {
    return this.studioMembershipRepository.count(where);
  }

  async isUserAdmin(userId: UserId): Promise<boolean> {
    const memberships = await this.studioMembershipRepository.findMany({
      where: {
        userId,
        role: 'admin',
        deletedAt: null,
      },
    });

    return memberships.length > 0;
  }

  /**
   * Find admin studio membership for user by ext_id
   * Returns the first admin membership found with optional relations included
   * This is optimized to query in a single database call by joining User and StudioMembership
   *
   * Use this method when you need the membership data, not just a boolean check.
   * For guard usage, check if the result is not null.
   *
   * @param extId - User's external ID (from JWT payload)
   * @param include - Optional Prisma include to load relations (e.g., { user: true, studio: true })
   * @returns StudioMembership with optional relations, or null if user is not admin
   */
  async findAdminMembershipByExtId<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    extId: string,
    include?: T,
  ): Promise<StudioMembership | StudioMembershipWithIncludes<T> | null> {
    return this.studioMembershipRepository.findAdminMembershipByExtId(
      extId,
      include,
    );
  }

  async isUserStudioAdmin(
    userId: UserId,
    studioId: StudioId,
  ): Promise<boolean> {
    const membership = await this.studioMembershipRepository.findOne({
      userId,
      studioId,
      role: 'admin',
      deletedAt: null,
    });

    return membership !== null;
  }

  async updateStudioMembershipFromDto<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    uid: string,
    dto: UpdateStudioMembershipDto,
    include?: T,
  ): Promise<StudioMembership | StudioMembershipWithIncludes<T>> {
    const data = this.buildUpdatePayload(dto);
    return this.updateStudioMembership(uid, data, include);
  }

  async updateStudioMembership<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    uid: string,
    data: Prisma.StudioMembershipUpdateInput,
    include?: T,
  ): Promise<StudioMembership | StudioMembershipWithIncludes<T>> {
    await this.findStudioMembershipOrThrow(uid);
    return this.studioMembershipRepository.updateByUnique(
      { uid },
      data,
      include,
    );
  }

  async deleteStudioMembership(uid: string): Promise<StudioMembership> {
    await this.findStudioMembershipOrThrow(uid);
    return this.studioMembershipRepository.softDeleteByUnique({ uid });
  }

  async restoreStudioMembership(
    id: StudioMembershipId,
  ): Promise<StudioMembership> {
    return this.studioMembershipRepository.restoreByUnique({ id });
  }

  private async findStudioMembershipOrThrow<
    T extends Prisma.StudioMembershipInclude = Record<string, never>,
  >(
    uid: string,
    include?: T,
  ): Promise<StudioMembership | StudioMembershipWithIncludes<T>> {
    const membership = await this.studioMembershipRepository.findByUid(
      uid,
      include,
    );
    if (!membership) {
      throw HttpError.notFound('Studio membership', uid);
    }
    return membership;
  }

  private buildCreatePayload(
    dto: CreateStudioMembershipDto,
  ): Omit<Prisma.StudioMembershipCreateInput, 'uid'> {
    return {
      user: { connect: { uid: dto.userId } },
      studio: { connect: { uid: dto.studioId } },
      role: dto.role,
      metadata: dto.metadata ?? {},
    };
  }

  private buildUpdatePayload(
    dto: UpdateStudioMembershipDto,
  ): Prisma.StudioMembershipUpdateInput {
    const payload: Prisma.StudioMembershipUpdateInput = {};

    if (dto.role !== undefined)
      payload.role = dto.role;
    if (dto.metadata !== undefined)
      payload.metadata = dto.metadata;

    if (dto.userId !== undefined) {
      payload.user = { connect: { uid: dto.userId } };
    }

    if (dto.studioId !== undefined) {
      payload.studio = { connect: { uid: dto.studioId } };
    }

    return payload;
  }
}
