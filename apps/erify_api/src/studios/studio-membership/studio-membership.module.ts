import { Module } from '@nestjs/common';

import { StudioMembersController } from './studio-members.controller';
import { StudioMembershipController } from './studio-membership.controller';

import { MembershipModule } from '@/models/membership/membership.module';
import { StudioShiftModule } from '@/models/studio-shift/studio-shift.module';

@Module({
  imports: [MembershipModule, StudioShiftModule],
  controllers: [StudioMembershipController, StudioMembersController],
})
export class StudioMembershipModule {}
