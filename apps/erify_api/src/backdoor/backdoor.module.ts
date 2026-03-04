import { Module } from '@nestjs/common';

import { BackdoorAuthModule } from './auth/backdoor-auth.module';
import { BackdoorMembershipModule } from './memberships/backdoor-membership.module';
import { BackdoorStudioModule } from './studios/backdoor-studio.module';
import { BackdoorTaskTemplateModule } from './task-templates/backdoor-task-template.module';
import { BackdoorUserModule } from './users/backdoor-user.module';

@Module({
  imports: [
    BackdoorAuthModule,
    BackdoorUserModule,
    BackdoorMembershipModule,
    BackdoorStudioModule,
    BackdoorTaskTemplateModule,
  ],
  exports: [
    BackdoorAuthModule,
    BackdoorUserModule,
    BackdoorMembershipModule,
    BackdoorStudioModule,
    BackdoorTaskTemplateModule,
  ],
})
export class BackdoorModule {}
