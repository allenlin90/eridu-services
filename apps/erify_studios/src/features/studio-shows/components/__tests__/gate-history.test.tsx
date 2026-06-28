import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GateHistory } from '../gate-history';

describe('gateHistory', () => {
  it('renders nothing when history is empty', () => {
    const { container } = render(<GateHistory history={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each entry with its event, actor, and note', () => {
    render(
      <GateHistory
        history={[
          { event: 'opened', actor: { uid: 'user_1', name: 'Jane Duty' }, at: '2026-06-25T16:14:30.201Z', note: 'Camera failed', outcome: null },
          { event: 'resolved', actor: { uid: 'user_2', name: 'Bob Manager' }, at: '2026-06-25T17:00:00.000Z', note: 'Confirmed', outcome: 'CANCELLED' },
        ]}
      />,
    );

    expect(screen.getByText('Opened')).toBeInTheDocument();
    expect(screen.getByText('Jane Duty')).toBeInTheDocument();
    expect(screen.getByText('Camera failed')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('Bob Manager')).toBeInTheDocument();
    expect(screen.getByText(/CANCELLED/)).toBeInTheDocument();
  });

  it('renders "System" for a null actor (schedule-publish-triggered gate)', () => {
    render(
      <GateHistory
        history={[
          { event: 'opened', actor: null, at: '2026-06-25T16:14:30.201Z', note: 'Removed from republished schedule', outcome: null },
        ]}
      />,
    );

    expect(screen.getByText('System')).toBeInTheDocument();
  });
});
