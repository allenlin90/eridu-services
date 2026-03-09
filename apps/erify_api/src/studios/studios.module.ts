import { Module } from '@nestjs/common';

import { StudioEconomicsModule } from './studio-economics/studio-economics.module';
import { StudioLookupModule } from './studio-lookup/studio-lookup.module';
import { StudioMcModule } from './studio-mc/studio-mc.module';
import { StudioMembershipModule } from './studio-membership/studio-membership.module';
import { StudioShiftApiModule } from './studio-shift/studio-shift.module';
import { StudioShowModule } from './studio-show/studio-show.module';
import { StudioTaskModule } from './studio-task/studio-task.module';
import { StudioTaskTemplateModule } from './studio-task-template/studio-task-template.module';

@Module({
  imports: [
    StudioEconomicsModule,
    StudioLookupModule,
    StudioMcModule,
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
