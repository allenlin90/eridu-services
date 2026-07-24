import { assertGenericShowStatusChangeAllowed } from './show-status-write-policy';

describe('assertGenericShowStatusChangeAllowed', () => {
  it('allows a generic change between statuses not owned by the cancellation gate', () => {
    expect(() =>
      assertGenericShowStatusChangeAllowed('CONFIRMED', 'LIVE'),
    ).not.toThrow();
  });

  it.each([
    [
      'leaving pending resolution',
      'CANCELLED_PENDING_RESOLUTION',
      'LIVE',
      'SHOW_STATUS_LOCKED_BY_PENDING_CANCELLATION',
    ],
    [
      'leaving cancelled',
      'CANCELLED',
      'DRAFT',
      'SHOW_STATUS_LOCKED_BY_CANCELLATION_GATE',
    ],
    [
      'entering pending resolution',
      'LIVE',
      'CANCELLED_PENDING_RESOLUTION',
      'SHOW_STATUS_PENDING_RESOLUTION_REQUIRES_GATE',
    ],
    [
      'entering cancelled',
      'CONFIRMED',
      'CANCELLED',
      'SHOW_STATUS_CANCELLATION_REQUIRES_GATE',
    ],
  ])('rejects %s', (_case, currentSystemKey, targetSystemKey, message) => {
    expect(() =>
      assertGenericShowStatusChangeAllowed(currentSystemKey, targetSystemKey),
    ).toThrow(message);
  });
});
