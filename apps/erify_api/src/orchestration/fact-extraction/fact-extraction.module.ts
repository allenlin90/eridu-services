import { forwardRef, Module } from '@nestjs/common';

import { ExtractorRegistry } from './extractors/extractor-registry';
import { ShowActualStartTimeExtractor } from './extractors/show-actual-start-time.extractor';
import { FactExtractionService } from './fact-extraction.service';

import { AuditModule } from '@/models/audit/audit.module';
import { ShowModule } from '@/models/show/show.module';
import { TaskModule } from '@/models/task/task.module';

/**
 * PR 12.0.5 — ingestion pipeline foundation. Provides `FactExtractionService`
 * as the single entry point for downstream callers (task submission flow,
 * future manager override paths, telemetry adapters). Extractors are
 * registered explicitly in `ExtractorRegistry`; sub-PRs 12.1.x / 12.2 /
 * 12.3.2 add more without touching the orchestrator.
 *
 * The `TaskModule` import is wrapped in `forwardRef` because TaskService
 * triggers extraction after a COMPLETED transition — see TaskModule for the
 * other half of the cycle.
 */
@Module({
  imports: [forwardRef(() => TaskModule), AuditModule, ShowModule],
  providers: [
    FactExtractionService,
    ExtractorRegistry,
    ShowActualStartTimeExtractor,
  ],
  exports: [FactExtractionService],
})
export class FactExtractionModule {}
