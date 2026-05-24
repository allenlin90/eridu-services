import { Injectable } from '@nestjs/common';

import type { SystemFactKey } from '@eridu/api-types/task-management';

import type { IngestionExtractor } from './extractor.types';
import { ShowActualEndTimeExtractor } from './show-actual-end-time.extractor';
import { ShowActualStartTimeExtractor } from './show-actual-start-time.extractor';
import { ShowPlatformActualEndTimeExtractor } from './show-platform-actual-end-time.extractor';
import { ShowPlatformActualStartTimeExtractor } from './show-platform-actual-start-time.extractor';

/**
 * Routes a `SystemFactKey` to the extractor responsible for resolving it
 * against an indexed column. Unregistered keys are no-ops at extraction
 * time — submissions still validate at write but the engine silently skips
 * the field rather than refusing the whole submission.
 *
 * PR 12.0.5 shipped the first writers (`show_actual_start_time`); 12.1.1
 * added `show_actual_end_time`; 12.1.2 wires the platform-scoped pair.
 * Subsequent sub-PRs (12.2, 12.3.2) register more without changing this
 * file's public surface.
 */
@Injectable()
export class ExtractorRegistry {
  private readonly byFactKey: Map<SystemFactKey, IngestionExtractor>;

  constructor(
    showActualStartTimeExtractor: ShowActualStartTimeExtractor,
    showActualEndTimeExtractor: ShowActualEndTimeExtractor,
    showPlatformActualStartTimeExtractor: ShowPlatformActualStartTimeExtractor,
    showPlatformActualEndTimeExtractor: ShowPlatformActualEndTimeExtractor,
  ) {
    this.byFactKey = new Map<SystemFactKey, IngestionExtractor>([
      [showActualStartTimeExtractor.factKey, showActualStartTimeExtractor],
      [showActualEndTimeExtractor.factKey, showActualEndTimeExtractor],
      [showPlatformActualStartTimeExtractor.factKey, showPlatformActualStartTimeExtractor],
      [showPlatformActualEndTimeExtractor.factKey, showPlatformActualEndTimeExtractor],
    ]);
  }

  resolve(factKey: SystemFactKey): IngestionExtractor | undefined {
    return this.byFactKey.get(factKey);
  }

  has(factKey: SystemFactKey): boolean {
    return this.byFactKey.has(factKey);
  }

  registeredFactKeys(): SystemFactKey[] {
    return Array.from(this.byFactKey.keys());
  }
}
