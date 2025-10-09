import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { UtilityService } from '../utility/utility.service';
import { CreateUserDto } from './schemas/user.schema';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  static readonly UID_PREFIX = 'user';

  constructor(
    private readonly userRepository: UserRepository,
    private readonly utilityService: UtilityService,
  ) {}

  async createUser(data: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      OR: [{ email: data.email }, { extId: data.extId }],
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const uid = this.utilityService.generateBrandedId(UserService.UID_PREFIX);

    const payload = {
      ...data,
      uid,
    };

    return this.userRepository.create(payload);
  }

  /**
   * Retrieves a user by ID
   */
  async getUserById(id: number): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User not found with id ${id}`);
    }

    return user;
  }

  /**
   * Updates a user's information
   */
  async updateUser(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User not found with id ${id}`);
    }

    // Check for email uniqueness if email is being updated
    if (data.email) {
      const newEmail =
        typeof data.email === 'string' ? data.email : data.email.set;
      if (newEmail && newEmail !== user.email) {
        const existingUser = await this.userRepository.findByEmail(newEmail);
        if (existingUser) {
          throw new BadRequestException('Email already exists');
        }
      }
    }

    return this.userRepository.update({ id }, data);
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

  /**
   * Soft deletes a user
   */
  async deleteUser(id: number): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User not found with id ${id}`);
    }

    return this.userRepository.softDelete({ id });
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
