import { Module } from '@nestjs/common';

import { ShowIssueReconciliationService } from './show-issue-reconciliation.service';
import { ShowIssueWorkflowService } from './show-issue-workflow.service';

import { AuditModule } from '@/models/audit/audit.module';
import { MembershipModule } from '@/models/membership/membership.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowIssueModule } from '@/models/show-issue/show-issue.module';
import { UserModule } from '@/models/user/user.module';

/**
 * Owns both show-issue workflows: the manual workflow (authorization,
 * optimistic locking, audit coverage) and automated reconciliation
 * (`ShowIssueReconciliationService`, invoked by `FactExtractionProcessor` —
 * see "Module Boundary" in docs/SHOW_ISSUE_OWNERSHIP.md).
 * `FactExtractionModule` imports this module in one direction; show-issue
 * modules never import fact-extraction, so no `forwardRef` is needed.
 */
@Module({
  imports: [
    ShowIssueModule,
    ShowModule,
    MembershipModule,
    UserModule,
    AuditModule,
  ],
  providers: [ShowIssueWorkflowService, ShowIssueReconciliationService],
  exports: [ShowIssueWorkflowService, ShowIssueReconciliationService],
})
export class ShowIssueOrchestrationModule {}
