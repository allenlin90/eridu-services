import { Module } from '@nestjs/common';

import { AdminStudioMembershipController } from './admin-studio-membership.controller';

import { MembershipModule } from '@/models/membership/membership.module';

@Module({
  imports: [MembershipModule],
  controllers: [AdminStudioMembershipController],
})
export class AdminStudioMembershipModule {}
