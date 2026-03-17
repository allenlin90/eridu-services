import { Injectable, NotImplementedException } from '@nestjs/common';

/**
 * Resolves reporting scope for lightweight operations shared by endpoints.
 * Use case: source discovery and preflight counts before expensive report generation.
 */
@Injectable()
export class TaskReportScopeService {
  /**
   * Return contextual source templates/fields for the selected scope.
   */
  async getSources(studioUid: string, query: unknown): Promise<never> {
    void studioUid;
    void query;
    throw new NotImplementedException('Task report sources is not implemented yet');
  }

  /**
   * Return show/task counts and limit check for preflight confirmation.
   */
  async preflight(studioUid: string, payload: unknown): Promise<never> {
    void studioUid;
    void payload;
    throw new NotImplementedException('Task report preflight is not implemented yet');
  }
}
