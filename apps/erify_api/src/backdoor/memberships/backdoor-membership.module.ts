import { Module } from '@nestjs/common';

import { BackdoorMembershipController } from './backdoor-membership.controller';

import { MembershipModule } from '@/models/membership/membership.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [MembershipModule, UtilityModule],
  controllers: [BackdoorMembershipController],
})
export class BackdoorMembershipModule {}
