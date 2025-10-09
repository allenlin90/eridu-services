import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { MembershipRepository } from './membership.repository';
import { MembershipService } from './membership.service';

@Module({
  imports: [PrismaModule],
  providers: [MembershipService, MembershipRepository],
  exports: [MembershipService],
})
export class MembershipModule {}
