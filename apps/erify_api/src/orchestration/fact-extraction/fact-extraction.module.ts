import { Module } from '@nestjs/common';

import { CreatorActualEndTimeExtractor } from './extractors/creator-actual-end-time.extractor';
import { CreatorActualStartTimeExtractor } from './extractors/creator-actual-start-time.extractor';
import { CreatorAttendanceMissingExtractor } from './extractors/creator-attendance-missing.extractor';
import { ExtractorRegistry } from './extractors/extractor-registry';
import {
  PlatformCtoExtractor,
  PlatformCtrExtractor,
  PlatformGmvExtractor,
  PlatformViewCountExtractor,
} from './extractors/platform-performance-extractors';
import { ShowActualEndTimeExtractor } from './extractors/show-actual-end-time.extractor';
import { ShowActualStartTimeExtractor } from './extractors/show-actual-start-time.extractor';
import { ShowPlatformActualEndTimeExtractor } from './extractors/show-platform-actual-end-time.extractor';
import { ShowPlatformActualStartTimeExtractor } from './extractors/show-platform-actual-start-time.extractor';
import { ShowPlatformViolationExtractor } from './extractors/show-platform-violation.extractor';
import { FactExtractionProcessor } from './fact-extraction.processor';
import { FactExtractionService } from './fact-extraction.service';

import { AuditModule } from '@/models/audit/audit.module';
import { ShowModule } from '@/models/show/show.module';
import { ShowCreatorModule } from '@/models/show-creator/show-creator.module';
import { ShowPlatformModule } from '@/models/show-platform/show-platform.module';
import { ShowPlatformViolationModule } from '@/models/show-platform-violation/show-platform-violation.module';
import { TaskModule } from '@/models/task/task.module';
import { ShowIssueOrchestrationModule } from '@/show-issue-orchestration/show-issue-orchestration.module';

/**
 * PR 12.0.5 — ingestion pipeline foundation. Provides `FactExtractionService`
 * as the single entry point for downstream callers (task submission flow,
 * future manager override paths, telemetry adapters). Extractors are
 * registered explicitly in `ExtractorRegistry`; sub-PRs 12.1.x / 12.2 /
 * 12.3.2 add more without touching the orchestrator.
 *
 * Dependency direction is intentionally one-way: this module depends on
 * `TaskModule` (read-only access to task snapshot + sibling task scan) and
 * `ShowIssueOrchestrationModule` (automated issue reconciliation triggered
 * by attendance / platform-violation writes). Cross-cutting workflows that
 * need to fire extraction *after* a task update belong in
 * `TaskOrchestrationModule`, not here. Show-issue modules never import this
 * module back, so no `forwardRef` is needed — see "Module Boundary" in
 * docs/design/SHOW_ISSUE_OWNERSHIP_DESIGN.md.
 *
 * `FactExtractionProcessor` is an internal `@Transactional()` boundary that
 * pairs each indexed-column write with its audit envelope (and, when the
 * decision carries reconciliation signals, the resulting `ShowIssue`
 * mutation) in one transaction. It is NOT exported because it's an
 * implementation detail of the orchestrator; only `FactExtractionService`
 * is part of the public surface.
 */
@Module({
  imports: [
    TaskModule,
    AuditModule,
    ShowModule,
    ShowCreatorModule,
    ShowPlatformModule,
    ShowPlatformViolationModule,
    ShowIssueOrchestrationModule,
  ],
  providers: [
    FactExtractionService,
    FactExtractionProcessor,
    ExtractorRegistry,
    ShowActualStartTimeExtractor,
    ShowActualEndTimeExtractor,
    CreatorActualStartTimeExtractor,
    CreatorActualEndTimeExtractor,
    CreatorAttendanceMissingExtractor,
    ShowPlatformActualStartTimeExtractor,
    ShowPlatformActualEndTimeExtractor,
    ShowPlatformViolationExtractor,
    PlatformGmvExtractor,
    PlatformViewCountExtractor,
    PlatformCtrExtractor,
    PlatformCtoExtractor,
  ],
  exports: [FactExtractionService],
})
export class FactExtractionModule {}
