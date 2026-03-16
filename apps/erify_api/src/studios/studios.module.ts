import { Module } from '@nestjs/common';

import { StudioCreatorApiModule } from './studio-creator/studio-creator.module';
import { StudioLookupModule } from './studio-lookup/studio-lookup.module';
import { StudioMembershipModule } from './studio-membership/studio-membership.module';
import { StudioSettingsModule } from './studio-settings/studio-settings.module';
import { StudioShiftApiModule } from './studio-shift/studio-shift.module';
import { StudioShowModule } from './studio-show/studio-show.module';
import { StudioTaskModule } from './studio-task/studio-task.module';
import { StudioTaskTemplateModule } from './studio-task-template/studio-task-template.module';

@Module({
  imports: [
    StudioLookupModule,
    StudioCreatorApiModule,
    StudioMembershipModule,
    StudioSettingsModule,
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
