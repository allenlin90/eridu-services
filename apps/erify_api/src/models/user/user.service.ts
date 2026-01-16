import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { CreateUserDto, UpdateUserDto } from './schemas/user.schema';
import { UserRepository } from './user.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { McService } from '@/models/mc/mc.service';
import { UtilityService } from '@/utility/utility.service';

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
    const { mc, ...userData } = data;
    const uid = this.generateUid();

    return this.userRepository.create({
      ...userData,
      uid,
      ...(mc && { mc: {
        create: {
          name: mc.name,
          aliasName: mc.aliasName,
          metadata: mc.metadata ?? {},
          uid: this.utilityService.generateBrandedId(McService.UID_PREFIX),
        },
      } }),
    }, {
      mc: true,
    });
  }

  async createUsersBulk(data: CreateUserDto[]): Promise<User[]> {
    const { usersWithMc, usersWithoutMc } = this.separateUsersByMcPresence(data);

    const [bulkCreatedUsers, individualCreatedUsers] = await Promise.all([
      this.createUsersWithoutMc(usersWithoutMc),
      this.createUsersWithMc(usersWithMc),
    ]);

    return [...bulkCreatedUsers, ...individualCreatedUsers];
  }

  private separateUsersByMcPresence(data: CreateUserDto[]) {
    return data.reduce(
      (acc, user) => {
        if (user.mc) {
          acc.usersWithMc.push(user);
        } else {
          acc.usersWithoutMc.push(user);
        }
        return acc;
      },
      { usersWithMc: [] as CreateUserDto[], usersWithoutMc: [] as CreateUserDto[] },
    );
  }

  private async createUsersWithoutMc(users: CreateUserDto[]): Promise<User[]> {
    if (users.length === 0)
      return [];

    const createInputs = users.map(({ mc: _mc, ...userData }) => ({
      ...userData,
      uid: this.generateUid(),
    }));

    return this.userRepository.createManyAndReturn(createInputs);
  }

  private async createUsersWithMc(users: CreateUserDto[]): Promise<User[]> {
    if (users.length === 0)
      return [];

    const createPromises = users.map((user) => this.createUser(user));
    return Promise.all(createPromises);
  }

  async getUserById(uid: string): Promise<User> {
    return this.findUserOrThrow(uid);
  }

  async findUserById(uid: string): Promise<User | null> {
    return this.userRepository.findByUid(uid);
  }

  async getUserByExtId(extId: string): Promise<User | null> {
    return this.userRepository.findByExtId(extId);
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

  async listUsers(params: {
    skip?: number;
    take?: number;
    name?: string;
    email?: string;
    uid?: string;
    where?: Prisma.UserWhereInput;
  }): Promise<{ data: User[]; total: number }> {
    const where: Prisma.UserWhereInput = { ...params.where };

    if (params.name) {
      where.name = {
        contains: params.name,
        mode: 'insensitive',
      };
    }

    if (params.email) {
      where.email = {
        contains: params.email,
        mode: 'insensitive',
      };
    }

    if (params.uid) {
      where.uid = {
        contains: params.uid,
        mode: 'insensitive',
      };
    }

    const [data, total] = await Promise.all([
      this.userRepository.findMany({
        skip: params.skip,
        take: params.take,
        where,
      }),
      this.userRepository.count(where),
    ]);

    return { data, total };
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
