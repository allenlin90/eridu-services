import { Module } from '@nestjs/common';

import { BackdoorMembershipModule } from './memberships/backdoor-membership.module';
import { BackdoorUserModule } from './users/backdoor-user.module';

@Module({
  imports: [BackdoorUserModule, BackdoorMembershipModule],
  exports: [BackdoorUserModule, BackdoorMembershipModule],
})
export class BackdoorModule {}
