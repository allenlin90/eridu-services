import { Module } from '@nestjs/common';

import { MembershipModule } from '@/models/membership/membership.module';
import { UtilityModule } from '@/utility/utility.module';

import { BackdoorMembershipController } from './backdoor-membership.controller';

@Module({
  imports: [MembershipModule, UtilityModule],
  controllers: [BackdoorMembershipController],
})
export class BackdoorMembershipModule {}
