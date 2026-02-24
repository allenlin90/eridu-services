import { Module } from '@nestjs/common';

import { AdminTaskTemplateController } from './admin-task-template.controller';

import { TaskTemplateModule } from '@/models/task-template/task-template.module';

@Module({
  imports: [TaskTemplateModule],
  controllers: [AdminTaskTemplateController],
})
export class AdminTaskTemplateModule {}
