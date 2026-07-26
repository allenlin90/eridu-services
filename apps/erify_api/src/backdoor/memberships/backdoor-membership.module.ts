import { Module } from '@nestjs/common';

import { BackdoorMembershipController } from './backdoor-membership.controller';

import { MembershipModule } from '@/models/membership/membership.module';

@Module({
  imports: [MembershipModule],
  controllers: [BackdoorMembershipController],
})
export class BackdoorMembershipModule {}
