import { Module } from '@nestjs/common';

import { StudioCreatorModule } from './studio-creator/studio-creator.module';
import { StudioEconomicsModule } from './studio-economics/studio-economics.module';
import { StudioLookupModule } from './studio-lookup/studio-lookup.module';
import { StudioMembershipModule } from './studio-membership/studio-membership.module';
import { StudioShiftApiModule } from './studio-shift/studio-shift.module';
import { StudioShowModule } from './studio-show/studio-show.module';
import { StudioTaskModule } from './studio-task/studio-task.module';
import { StudioTaskTemplateModule } from './studio-task-template/studio-task-template.module';

@Module({
  imports: [
    StudioEconomicsModule,
    StudioLookupModule,
    StudioCreatorModule,
    StudioMembershipModule,
    StudioShiftApiModule,
    StudioTaskTemplateModule,
    StudioTaskModule,
    StudioShowModule,
  ],
  exports: [
    StudioTaskTemplateModule,
    StudioTaskModule,
    StudioShowModule,
  ],
})
export class StudiosModule {}
