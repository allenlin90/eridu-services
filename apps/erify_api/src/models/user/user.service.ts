import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

import type {
  CreateUserPayload,
  UpdateUserPayload,
  UserOrderBy,
} from './schemas/user.schema';
import {
  ListUsersQueryDto,
} from './schemas/user.schema';
import { UserRepository } from './user.repository';

import { BaseModelService } from '@/lib/services/base-model.service';
import { CREATOR_UID_PREFIX } from '@/models/creator/creator-uid.util';
import { UtilityService } from '@/utility/utility.service';

/**
 * Service for managing User entities.
 */
@Injectable()
export class UserService extends BaseModelService {
  static readonly UID_PREFIX = 'user';
  protected readonly uidPrefix = UserService.UID_PREFIX;

  constructor(
    private readonly userRepository: UserRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  /**
   * Creates a new user.
   */
  async createUser(
    payload: CreateUserPayload,
  ): Promise<User> {
    const { mc, ...userData } = payload;
    const uid = this.generateUid();

    return this.userRepository.create({
      ...userData,
      uid,
      ...(mc && {
        mc: {
          create: {
            name: mc.name,
            aliasName: mc.aliasName,
            metadata: mc.metadata ?? {},
            uid: this.utilityService.generateBrandedId(CREATOR_UID_PREFIX),
          },
        },
      }),
    });
  }

  async createUsersBulk(payloads: CreateUserPayload[]): Promise<User[]> {
    const { usersWithMc, usersWithoutMc }
      = this.separateUsersByMcPresence(payloads);

    const [bulkCreatedUsers, individualCreatedUsers] = await Promise.all([
      this.createUsersWithoutMc(usersWithoutMc),
      this.createUsersWithMc(usersWithMc),
    ]);

    return [...bulkCreatedUsers, ...individualCreatedUsers];
  }

  private separateUsersByMcPresence(payloads: CreateUserPayload[]) {
    return payloads.reduce(
      (acc, user) => {
        if (user.mc) {
          acc.usersWithMc.push(user);
        } else {
          acc.usersWithoutMc.push(user);
        }
        return acc;
      },
      {
        usersWithMc: [] as CreateUserPayload[],
        usersWithoutMc: [] as CreateUserPayload[],
      },
    );
  }

  private async createUsersWithoutMc(users: CreateUserPayload[]): Promise<User[]> {
    if (users.length === 0)
      return [];

    const createInputs = users.map(({ mc: _mc, ...userData }) => ({
      ...userData,
      uid: this.generateUid(),
    }));

    return this.userRepository.createManyAndReturn(createInputs);
  }

  private async createUsersWithMc(users: CreateUserPayload[]): Promise<User[]> {
    if (users.length === 0)
      return [];

    const createPromises = users.map((user) => this.createUser(user));
    return Promise.all(createPromises);
  }

  /**
   * Retrieves a user by UID.
   * Returns null if not found (Controller handles 404).
   */
  async getUserById(uid: string): Promise<User | null> {
    return this.userRepository.findByUid(uid);
  }

  /**
   * Specialized method to get user with profile (if needed for internal logic)
   * @internal
   */
  async getUserWithProfile(uid: string) {
    return this.userRepository.findByUid(uid);
  }

  async findUserById(uid: string): Promise<User | null> {
    return this.userRepository.findByUid(uid);
  }

  async getUserByExtId(extId: string): Promise<User | null> {
    return this.userRepository.findByExtId(extId);
  }

  /**
   * Retrieves a user's membership for a specific studio.
   * Used by StudioGuard.
   */
  async getStudioMembership(extId: string, studioUid: string) {
    const user = await this.userRepository.findByExtId(extId, {
      studioMemberships: {
        where: {
          studio: { uid: studioUid },
          deletedAt: null,
        },
        include: {
          studio: {
            select: {
              uid: true,
            },
          },
        },
      },
    });
    return user?.studioMemberships?.[0];
  }

  /**
   * Retrieves a user with all their studio memberships.
   * Used by ProfileController.
   */
  async getUserWithAllStudioMemberships(extId: string) {
    return this.userRepository.findByExtId(extId, {
      studioMemberships: {
        include: {
          studio: true,
        },
      },
    });
  }

  /**
   * Retrieves active users.
   */
  async getActiveUsers(params: {
    skip?: number;
    take?: number;
    orderBy?: UserOrderBy;
  }): Promise<User[]> {
    return this.userRepository.findActiveUsers(params);
  }

  /**
   * Counts users matching criteria.
   */
  async countUsers(
    where?: Parameters<UserRepository['count']>[0],
  ): Promise<number> {
    return this.userRepository.count(where ?? {});
  }

  /**
   * Lists users with pagination and filtering.
   */
  async listUsers(
    query: ListUsersQueryDto,
  ): Promise<{ data: User[]; total: number }> {
    return this.userRepository.findPaginated(query);
  }

  /**
   * Updates a user.
   */
  async updateUser(
    uid: string,
    payload: UpdateUserPayload,
  ): Promise<User> {
    return this.userRepository.update({ uid }, payload);
  }

  /**
   * Soft deletes a user.
   */
  async deleteUser(uid: string): Promise<User> {
    return this.userRepository.softDelete({ uid });
  }
}
