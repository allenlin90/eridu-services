import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { HttpError } from '../common/errors/http-error.util';
import { BaseModelService } from '../common/services/base-model.service';
import { UtilityService } from '../utility/utility.service';
import { CreateUserDto, UpdateUserDto } from './schemas/user.schema';
import { UserRepository } from './user.repository';

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

  async createUser(data: CreateUserDto): Promise<User> {
    const uid = this.generateUid();
    return this.userRepository.create({ ...data, uid });
  }

  async getUserById(uid: string): Promise<User> {
    return this.findUserOrThrow(uid);
  }

  async findUserById(uid: string): Promise<User | null> {
    return this.userRepository.findByUid(uid);
  }

  async getUsers(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
  }): Promise<User[]> {
    return this.userRepository.findMany(params);
  }

  async getActiveUsers(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    return this.userRepository.findActiveUsers(params);
  }

  async countUsers(where?: Prisma.UserWhereInput): Promise<number> {
    return this.userRepository.count(where ?? {});
  }

  async updateUser(uid: string, data: UpdateUserDto): Promise<User> {
    await this.findUserOrThrow(uid);
    return this.userRepository.update({ uid }, data);
  }

  async deleteUser(uid: string): Promise<User> {
    await this.findUserOrThrow(uid);
    return this.userRepository.softDelete({ uid });
  }

  private async findUserOrThrow(uid: string): Promise<User> {
    const user = await this.userRepository.findByUid(uid);
    if (!user) {
      throw HttpError.notFound('User', uid);
    }
    return user;
  }
}
