import { Injectable, Logger } from '@nestjs/common';
import type { Show } from '@prisma/client';

import type { GateKind } from '@eridu/api-types/shows';

/**
 * Notification seam for the show cancellation gate — no real channel exists
 * yet (no EventEmitter2/domain-event pattern anywhere in erify_api). Both
 * methods are structured-log-only placeholders so future notification work
 * (stakeholder/client/creator alerts) has one narrow point to plug into
 * instead of threading new logic through ShowCancellationGateService.
 */
@Injectable()
export class GateNotificationService {
  private readonly logger = new Logger(GateNotificationService.name);

  notifyGateOpened(
    show: Show,
    gateKind: GateKind,
    reason: { category: string; note: string },
    actor: { uid: string; name: string } | null,
  ): void {
    this.logger.debug(
      `Gate opened for show ${show.uid} (${gateKind}) by ${actor?.name ?? 'system'} — ${reason.category}: ${reason.note}`,
    );
  }

  notifyGateResolved(
    show: Show,
    gateKind: GateKind,
    outcome: string,
    actor: { uid: string; name: string } | null,
  ): void {
    this.logger.debug(
      `Gate resolved for show ${show.uid} (${gateKind}) by ${actor?.name ?? 'system'} — outcome: ${outcome}`,
    );
  }
}
