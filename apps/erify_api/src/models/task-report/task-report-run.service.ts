import { Injectable, NotImplementedException } from '@nestjs/common';

/**
 * Executes the report generation pipeline for the run endpoint.
 * Use case: transform scoped submitted tasks into one-row-per-show result rows.
 */
@Injectable()
export class TaskReportRunService {
  /**
   * Run full report generation from resolved scope + selected columns.
   */
  async run(studioUid: string, payload: unknown): Promise<never> {
    void studioUid;
    void payload;
    throw new NotImplementedException('Task report run is not implemented yet');
  }
}
