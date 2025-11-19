import { Module } from '@nestjs/common';

import { BackdoorAuthModule } from './auth/backdoor-auth.module';
import { BackdoorMembershipModule } from './memberships/backdoor-membership.module';
import { BackdoorUserModule } from './users/backdoor-user.module';

@Module({
  imports: [BackdoorAuthModule, BackdoorUserModule, BackdoorMembershipModule],
  exports: [BackdoorAuthModule, BackdoorUserModule, BackdoorMembershipModule],
})
export class BackdoorModule {}
