import { Module } from '@nestjs/common';

import { StudioMembershipController } from './studio-membership.controller';

import { MembershipModule } from '@/models/membership/membership.module';

@Module({
  imports: [MembershipModule],
  controllers: [StudioMembershipController],
})
export class StudioMembershipModule {}
