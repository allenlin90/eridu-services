import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { HeldBackPayload } from '@eridu/api-types/shows';

import { HeldBackDiff } from '../held-back-diff';

import * as m from '@/paraglide/messages';

describe('heldBackDiff', () => {
  it('renders a plain scalar field change', () => {
    const heldBack: HeldBackPayload = {
      show_fields: { changed_fields: ['name'], old: { name: 'Friday Night Live' }, new: { name: 'Friday Night LIVE (Rebrand)' } },
      show_creators: [],
      show_platforms: [],
      proposed_status_transition: null,
    };
    render(<HeldBackDiff heldBack={heldBack} />);
    expect(screen.getByText('Friday Night Live')).toBeInTheDocument();
    expect(screen.getByText('Friday Night LIVE (Rebrand)')).toBeInTheDocument();
  });

  it('renders an FK-backed field change using the resolved name, never the uid', () => {
    const heldBack: HeldBackPayload = {
      show_fields: {
        changed_fields: ['show_type_id'],
        old: { show_type_id: { uid: 'shwtyp_1', name: 'bau' } },
        new: { show_type_id: { uid: 'shwtyp_2', name: 'campaign' } },
      },
      show_creators: [],
      show_platforms: [],
      proposed_status_transition: null,
    };
    render(<HeldBackDiff heldBack={heldBack} />);
    expect(screen.getByText('bau')).toBeInTheDocument();
    expect(screen.getByText('campaign')).toBeInTheDocument();
    expect(screen.queryByText('shwtyp_1')).not.toBeInTheDocument();
    expect(screen.queryByText('shwtyp_2')).not.toBeInTheDocument();
  });

  it('renders a held-back creator removal', () => {
    const heldBack: HeldBackPayload = {
      show_fields: null,
      show_creators: [{ creator_uid: 'creator_jane', action: 'remove', old_note: 'Backup host', new_note: null }],
      show_platforms: [],
      proposed_status_transition: null,
    };
    render(<HeldBackDiff heldBack={heldBack} />);
    expect(screen.getByText(/creator_jane/)).toBeInTheDocument();
    expect(screen.getByText(/Backup host/)).toBeInTheDocument();
  });

  it('renders a proposed status transition with the live-re-evaluation caveat', () => {
    const heldBack: HeldBackPayload = {
      show_fields: null,
      show_creators: [],
      show_platforms: [],
      proposed_status_transition: { from: 'DRAFT', to: 'CANCELLED_PENDING_RESOLUTION' },
    };
    render(<HeldBackDiff heldBack={heldBack} />);
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
    expect(screen.getByText('CANCELLED_PENDING_RESOLUTION')).toBeInTheDocument();
    expect(screen.getByText(m.schedule_conflict_status_transition_caveat())).toBeInTheDocument();
  });
});
