import { Module } from '@nestjs/common';

import { MembershipModule } from '@/models/membership/membership.module';
import { UtilityModule } from '@/utility/utility.module';

import { AdminStudioMembershipController } from './admin-studio-membership.controller';

@Module({
  imports: [MembershipModule, UtilityModule],
  controllers: [AdminStudioMembershipController],
})
export class AdminStudioMembershipModule {}
