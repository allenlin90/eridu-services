import { Module } from '@nestjs/common';

import { StudioShowIssueController } from './studio-show-issue.controller';

import { StudioModule } from '@/models/studio/studio.module';
import { ShowIssueOrchestrationModule } from '@/show-issue-orchestration/show-issue-orchestration.module';

@Module({
  imports: [ShowIssueOrchestrationModule, StudioModule],
  controllers: [StudioShowIssueController],
})
export class StudioShowIssueModule {}
