import { Injectable } from '@nestjs/common';

import { HttpError } from '@/lib/errors/http-error.util';

const STUDIO_UID_PREFIX = 'std_';

@Injectable()
export class McpStudioPolicy {
  private readonly allowedStudioIds: Set<string>;

  constructor(allowedStudioIdsCsv = '', nodeEnv = 'development') {
    this.allowedStudioIds = new Set(
      allowedStudioIdsCsv
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );

    // Fail closed: the `/mcp` endpoint has no caller authentication in this
    // foundation phase, so an empty allowlist in production means unrestricted
    // cross-studio read access for anyone who can reach the service.
    if (nodeEnv === 'production' && this.allowedStudioIds.size === 0) {
      throw new Error(
        'MCP_ALLOWED_STUDIO_IDS must be configured with at least one studio UID in production.',
      );
    }
  }

  assertStudioAllowed(studioId: string): string {
    if (!studioId.startsWith(STUDIO_UID_PREFIX)) {
      throw HttpError.badRequest('studio_id must be a Studio UID');
    }

    // TODO(mcp-auth): Replace this foundation allowlist with internal app-to-app
    // auth and, for external clients, eridu_auth Better Auth API keys plus RBAC.
    if (
      this.allowedStudioIds.size > 0
      && !this.allowedStudioIds.has(studioId)
    ) {
      throw HttpError.forbidden('Studio is not enabled for MCP access');
    }

    return studioId;
  }
}
