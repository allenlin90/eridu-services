import { Module } from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

import { StudioMembershipRepository } from './studio-membership.repository';
import { StudioMembershipService } from './studio-membership.service';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [StudioMembershipService, StudioMembershipRepository],
  exports: [StudioMembershipService],
})
export class MembershipModule {}
