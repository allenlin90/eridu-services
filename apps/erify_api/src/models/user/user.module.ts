import { Module } from '@nestjs/common';

import { UserRepository } from './user.repository';
import { UserService } from './user.service';

import { McModule } from '@/models/mc/mc.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule, McModule],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
