import { Module } from '@nestjs/common';

import { StudioMembersController } from './studio-members.controller';
import { StudioMembershipController } from './studio-membership.controller';

import { MembershipModule } from '@/models/membership/membership.module';

@Module({
  imports: [MembershipModule],
  controllers: [StudioMembershipController, StudioMembersController],
})
export class StudioMembershipModule {}
