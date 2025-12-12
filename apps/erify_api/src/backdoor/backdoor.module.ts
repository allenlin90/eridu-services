import { Module } from '@nestjs/common';

import { BackdoorAuthModule } from './auth/backdoor-auth.module';
import { BackdoorMembershipModule } from './memberships/backdoor-membership.module';
import { BackdoorStudioModule } from './studios/backdoor-studio.module';
import { BackdoorUserModule } from './users/backdoor-user.module';

@Module({
  imports: [
    BackdoorAuthModule,
    BackdoorUserModule,
    BackdoorMembershipModule,
    BackdoorStudioModule,
  ],
  exports: [
    BackdoorAuthModule,
    BackdoorUserModule,
    BackdoorMembershipModule,
    BackdoorStudioModule,
  ],
})
export class BackdoorModule {}
