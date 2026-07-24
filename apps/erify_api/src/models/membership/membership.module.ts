import { Module } from '@nestjs/common';

import { StudioMembershipRepository } from './studio-membership.repository';
import { StudioMembershipService } from './studio-membership.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { UserModule } from '@/models/user/user.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule, UserModule],
  providers: [StudioMembershipService, StudioMembershipRepository],
  exports: [StudioMembershipService],
})
export class MembershipModule {}
