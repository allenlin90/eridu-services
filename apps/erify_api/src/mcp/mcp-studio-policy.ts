import { Injectable } from '@nestjs/common';

import { HttpError } from '@/lib/errors/http-error.util';

const STUDIO_UID_PREFIX = 'std_';

@Injectable()
export class McpStudioPolicy {
  private readonly allowedStudioIds: Set<string>;

  constructor(allowedStudioIdsCsv = '') {
    this.allowedStudioIds = new Set(
      allowedStudioIdsCsv
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }

  assertStudioAllowed(studioId: string): string {
    if (!studioId.startsWith(STUDIO_UID_PREFIX)) {
      throw HttpError.badRequest('studio_id must be a Studio UID');
    }

    if (
      this.allowedStudioIds.size > 0
      && !this.allowedStudioIds.has(studioId)
    ) {
      throw HttpError.forbidden('Studio is not enabled for MCP access');
    }

    return studioId;
  }
}
