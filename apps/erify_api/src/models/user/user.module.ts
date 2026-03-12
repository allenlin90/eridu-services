import { Module } from '@nestjs/common';

import { UserRepository } from './user.repository';
import { UserService } from './user.service';

import { CreatorModule } from '@/models/creator/creator.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule, CreatorModule],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
