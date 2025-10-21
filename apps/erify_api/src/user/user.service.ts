import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { HttpError } from '../common/errors/http-error.util';
import { PRISMA_ERROR } from '../common/errors/prisma-error-codes';
import { UtilityService } from '../utility/utility.service';
import { CreateUserDto, UpdateUserDto } from './schemas/user.schema';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  static readonly UID_PREFIX = 'user';

  constructor(
    private readonly userRepository: UserRepository,
    private readonly utilityService: UtilityService,
  ) {}

  async createUser(data: CreateUserDto): Promise<User> {
    const uid = this.utilityService.generateBrandedId(UserService.UID_PREFIX);

    const payload = {
      ...data,
      uid,
    };

    try {
      return await this.userRepository.create(payload);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR.UniqueConstraint
      ) {
        throw HttpError.conflict('Email already exists');
      }
      throw error;
    }
  }

  /**
   * Retrieves a user by ID
   */
  async getUserById(uid: string): Promise<User> {
    const user = await this.userRepository.findByUid(uid);

    if (!user) {
      throw HttpError.notFound('User', uid);
    }

    return user;
  }

  async findUserById(uid: string): Promise<User | null> {
    const user = await this.userRepository.findByUid(uid);

    return user;
  }

  /**
   * Updates a user's information
   */
  async updateUser(uid: string, data: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findByUid(uid);

    if (!user) {
      throw HttpError.notFound('User', uid);
    }

    try {
      return await this.userRepository.update({ uid }, data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR.UniqueConstraint
      ) {
        throw HttpError.conflict('Email already exists');
      }
      throw error;
    }
  }

  /**
   * Retrieves all users with pagination
   */
  async getUsers(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
  }): Promise<User[]> {
    const { skip, take, where } = params;
    return this.userRepository.findMany({
      skip,
      take,
      where,
    });
  }

  async countUsers(where?: Prisma.UserWhereInput): Promise<number> {
    return this.userRepository.count(where ?? ({} as Prisma.UserWhereInput));
  }

  /**
   * Soft deletes a user
   */
  async deleteUser(uid: string): Promise<User> {
    const user = await this.userRepository.findByUid(uid);

    if (!user) {
      throw HttpError.notFound('User', uid);
    }

    return this.userRepository.softDelete({ uid });
  }

  /**
   * Retrieves active users with pagination
   */
  async getActiveUsers(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    return this.userRepository.findActiveUsers(params);
  }
}
