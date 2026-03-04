import { Module } from '@nestjs/common';

import { BackdoorTaskTemplateController } from './backdoor-task-template.controller';

import { TaskTemplateModule } from '@/models/task-template/task-template.module';

@Module({
  imports: [TaskTemplateModule],
  controllers: [BackdoorTaskTemplateController],
})
export class BackdoorTaskTemplateModule {}
