import { Module } from '@nestjs/common';

import { StudioTaskTemplateController } from './studio-task-template.controller';

import { ShowModule } from '@/models/show/show.module';
import { TaskTemplateModule } from '@/models/task-template/task-template.module';

@Module({
  imports: [
    TaskTemplateModule,
    ShowModule,
  ],
  controllers: [
    StudioTaskTemplateController,
  ],
})
export class StudioTaskTemplateModule {}
