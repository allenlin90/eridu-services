import { Module } from '@nestjs/common';

import { AdminStudioMembershipController } from './admin-studio-membership.controller';

import { MembershipModule } from '@/models/membership/membership.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [MembershipModule, UtilityModule],
  controllers: [AdminStudioMembershipController],
})
export class AdminStudioMembershipModule {}
