import { Module } from '@nestjs/common';

import { UserRepository } from './user.repository';
import { UserService } from './user.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { CreatorModule } from '@/models/creator/creator.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule, CreatorModule],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
