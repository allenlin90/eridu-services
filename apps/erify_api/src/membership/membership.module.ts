import { Module } from '@nestjs/common';

import { ClientModule } from '../client/client.module';
import { PlatformModule } from '../platform/platform.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StudioModule } from '../studio/studio.module';
import { UtilityModule } from '../utility/utility.module';
import { MembershipRepository } from './membership.repository';
import { MembershipService } from './membership.service';

@Module({
  imports: [
    PrismaModule,
    UtilityModule,
    ClientModule,
    PlatformModule,
    StudioModule,
  ],
  providers: [MembershipService, MembershipRepository],
  exports: [MembershipService],
})
export class MembershipModule {}
