import { Module } from '@nestjs/common';

import { StudioTaskReportController } from './studio-task-report.controller';

import { TaskReportModule } from '@/models/task-report/task-report.module';

@Module({
  imports: [TaskReportModule],
  controllers: [StudioTaskReportController],
})
export class StudioTaskReportModule {}
