import { Module } from '@nestjs/common';

import { StudioTaskTemplateController } from './studio-task-template.controller';

import { TaskTemplateModule } from '@/models/task-template/task-template.module';

@Module({
  imports: [
    TaskTemplateModule,
  ],
  controllers: [
    StudioTaskTemplateController,
  ],
})
export class StudioTaskTemplateModule {}
