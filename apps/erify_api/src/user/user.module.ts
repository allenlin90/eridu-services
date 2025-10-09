import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { UtilityModule } from '../utility/utility.module';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
