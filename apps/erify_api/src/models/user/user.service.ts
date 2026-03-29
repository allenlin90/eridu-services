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
    const { creator, ...userData } = payload;
    const uid = this.generateUid();

    return this.userRepository.create({
      ...userData,
      uid,
      ...(creator && {
        creator: {
          create: {
            name: creator.name,
            aliasName: creator.aliasName,
            metadata: creator.metadata ?? {},
            uid: this.utilityService.generateBrandedId(CREATOR_UID_PREFIX),
          },
        },
      }),
    });
  }

  async createUsersBulk(payloads: CreateUserPayload[]): Promise<User[]> {
    const { usersWithCreator, usersWithoutCreator }
      = this.separateUsersByCreatorPresence(payloads);

    const [bulkCreatedUsers, individualCreatedUsers] = await Promise.all([
      this.createUsersWithoutCreator(usersWithoutCreator),
      this.createUsersWithCreator(usersWithCreator),
    ]);

    return [...bulkCreatedUsers, ...individualCreatedUsers];
  }

  private separateUsersByCreatorPresence(payloads: CreateUserPayload[]) {
    return payloads.reduce(
      (acc, user) => {
        if (user.creator) {
          acc.usersWithCreator.push(user);
        } else {
          acc.usersWithoutCreator.push(user);
        }
        return acc;
      },
      {
        usersWithCreator: [] as CreateUserPayload[],
        usersWithoutCreator: [] as CreateUserPayload[],
      },
    );
  }

  private async createUsersWithoutCreator(users: CreateUserPayload[]): Promise<User[]> {
    if (users.length === 0)
      return [];

    const createInputs = users.map(({ creator: _creator, ...userData }) => ({
      ...userData,
      uid: this.generateUid(),
    }));

    return this.userRepository.createManyAndReturn(createInputs);
  }

  private async createUsersWithCreator(users: CreateUserPayload[]): Promise<User[]> {
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

  /**
   * @internal
   */
  findUserById(
    ...args: Parameters<UserRepository['findByUid']>
  ): ReturnType<UserRepository['findByUid']> {
    return this.userRepository.findByUid(...args);
  }

  async getUserByExtId(extId: string): Promise<User | null> {
    return this.userRepository.findByExtId(extId);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
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

  searchUsersForCreatorOnboarding(
    params: {
      search: string;
      limit: number;
    },
  ): ReturnType<UserRepository['searchUsersForCreatorOnboarding']> {
    return this.userRepository.searchUsersForCreatorOnboarding(params);
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
