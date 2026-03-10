import { Module } from '@nestjs/common';

import { StudioMembershipRepository } from './studio-membership.repository';
import { StudioMembershipService } from './studio-membership.service';

import { UserModule } from '@/models/user/user.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule, UserModule],
  providers: [StudioMembershipService, StudioMembershipRepository],
  exports: [StudioMembershipService],
})
export class MembershipModule {}
