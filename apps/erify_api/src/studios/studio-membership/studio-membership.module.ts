import { Module } from '@nestjs/common';

import { StudioMembershipController } from './studio-membership.controller';

import { MembershipModule } from '@/models/membership/membership.module';
import { UserModule } from '@/models/user/user.module';

@Module({
  imports: [MembershipModule, UserModule],
  controllers: [StudioMembershipController],
})
export class StudioMembershipModule {}
