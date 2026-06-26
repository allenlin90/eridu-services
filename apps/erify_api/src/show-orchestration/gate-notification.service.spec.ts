import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Show } from '@prisma/client';

import { GateNotificationService } from './gate-notification.service';

describe('gateNotificationService', () => {
  let service: GateNotificationService;
  const show = { id: 1n, uid: 'show_abc' } as Show;
  const actor = { uid: 'user_abc', name: 'Jane Duty' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GateNotificationService],
    }).compile();
    service = module.get(GateNotificationService);
  });

  it('notifyGateOpened does not throw and returns nothing', () => {
    expect(() =>
      service.notifyGateOpened(show, 'show_cancellation', { category: 'EQUIPMENT_FAILURE', note: 'Camera failed' }, actor),
    ).not.toThrow();
  });

  it('notifyGateResolved does not throw and returns nothing', () => {
    expect(() =>
      service.notifyGateResolved(show, 'show_cancellation', 'CANCELLED', actor),
    ).not.toThrow();
  });

  it('notifyGateOpened accepts a null actor for system-generated gates', () => {
    expect(() =>
      service.notifyGateOpened(show, 'schedule_publish_removal', { category: 'REMOVED_FROM_REPUBLISHED_SCHEDULE', note: 'note' }, null),
    ).not.toThrow();
  });
});
