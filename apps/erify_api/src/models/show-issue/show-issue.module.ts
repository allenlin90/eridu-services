import { Module } from '@nestjs/common';

import { ShowIssueRepository } from './show-issue.repository';
import { ShowIssueService } from './show-issue.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

// Owns repository and single-model service behavior. Exports only
// ShowIssueService — the repository stays private, per the design doc's
// module boundary (docs/SHOW_ISSUE_OWNERSHIP.md).
@Module({
  imports: [PrismaModule, UidGeneratorModule],
  providers: [ShowIssueService, ShowIssueRepository],
  exports: [ShowIssueService],
})
export class ShowIssueModule {}
