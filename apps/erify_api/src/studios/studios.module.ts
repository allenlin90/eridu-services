import { Module } from '@nestjs/common';

import { StudioShowModule } from './studio-show/studio-show.module';
import { StudioTaskModule } from './studio-task/studio-task.module';
import { StudioTaskTemplateModule } from './studio-task-template/studio-task-template.module';

@Module({
  imports: [
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
