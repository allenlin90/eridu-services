import { Module } from '@nestjs/common';

import { StudioLookupModule } from './studio-lookup/studio-lookup.module';
import { StudioMembershipModule } from './studio-membership/studio-membership.module';
import { StudioShowModule } from './studio-show/studio-show.module';
import { StudioTaskModule } from './studio-task/studio-task.module';
import { StudioTaskTemplateModule } from './studio-task-template/studio-task-template.module';

@Module({
  imports: [
    StudioLookupModule,
    StudioMembershipModule,
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
