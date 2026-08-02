import { Module } from '@nestjs/common';

import { ShowIssueWorkflowService } from './show-issue-workflow.service';

import { AuditModule } from '@/models/audit/audit.module';
import { MembershipModule } from '@/models/membership/membership.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowIssueModule } from '@/models/show-issue/show-issue.module';
import { UserModule } from '@/models/user/user.module';

/**
 * Owns the manual show-issue workflow (authorization, optimistic locking,
 * audit coverage). Automated reconciliation
 * (`ShowIssueReconciliationService` + `FactExtractionModule` wiring) is a
 * later pass — see docs/design/SHOW_ISSUE_OWNERSHIP_DESIGN.md "Delivery
 * Sequence".
 */
@Module({
  imports: [
    ShowIssueModule,
    ShowModule,
    MembershipModule,
    UserModule,
    AuditModule,
  ],
  providers: [ShowIssueWorkflowService],
  exports: [ShowIssueWorkflowService],
})
export class ShowIssueOrchestrationModule {}
