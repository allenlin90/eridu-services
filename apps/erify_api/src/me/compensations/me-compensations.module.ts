import { Module } from '@nestjs/common';

import { MeShiftCompensationsController } from './me-shift-compensations.controller';
import { MeShiftCompensationsService } from './me-shift-compensations.service';
import { MeShowCompensationsController } from './me-show-compensations.controller';
import { MeShowCompensationsService } from './me-show-compensations.service';

import { CreatorModule } from '@/models/creator/creator.module';
import { MembershipModule } from '@/models/membership/membership.module';
import { StudioShiftModule } from '@/models/studio-shift/studio-shift.module';
import { UserModule } from '@/models/user/user.module';
import { ShowOrchestrationModule } from '@/show-orchestration/show-orchestration.module';

@Module({
  imports: [UserModule, MembershipModule, StudioShiftModule, CreatorModule, ShowOrchestrationModule],
  controllers: [MeShiftCompensationsController, MeShowCompensationsController],
  providers: [MeShiftCompensationsService, MeShowCompensationsService],
})
export class MeCompensationsModule {}
