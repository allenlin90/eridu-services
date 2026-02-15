import { Module } from '@nestjs/common';

import { StudioTaskTemplateModule } from './studio-task-template/studio-task-template.module';

@Module({
  imports: [
    StudioTaskTemplateModule,
  ],
  exports: [
    StudioTaskTemplateModule,
  ],
})
export class StudiosModule {}
