import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ShowIssueOwnerField } from '../show-issue-owner-field';

const mockUseStudioMembers = vi.fn();

vi.mock('@/features/studio-members/api/members', () => ({
  useStudioMembers: (...args: unknown[]) => mockUseStudioMembers(...args),
}));

describe('showIssueOwnerField', () => {
  it('shows the current owner name via initialLabel when they fall outside the search page', () => {
    mockUseStudioMembers.mockReturnValue({ data: { data: [] }, isLoading: false });

    render(
      <ShowIssueOwnerField
        studioId="std_1"
        value="user_outside_page"
        onChange={vi.fn()}
        initialOwnerId="user_outside_page"
        initialLabel="Off-page Owner"
      />,
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Off-page Owner');
  });

  it('prefers the freshly searched option over the stale initialLabel once it matches', () => {
    mockUseStudioMembers.mockReturnValue({
      data: { data: [{ user_id: 'user_1', user_name: 'Fresh Name', user_email: 'fresh@example.com' }] },
      isLoading: false,
    });

    render(
      <ShowIssueOwnerField
        studioId="std_1"
        value="user_1"
        onChange={vi.fn()}
        initialOwnerId="user_1"
        initialLabel="Stale Cached Name"
      />,
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Fresh Name');
    expect(screen.queryByText('Stale Cached Name')).not.toBeInTheDocument();
  });

  it('does not misattribute the original owner label to a reassigned owner outside the search page', () => {
    mockUseStudioMembers.mockReturnValue({ data: { data: [] }, isLoading: false });

    // The issue's original owner is user_alice ("Alice"), but the form's
    // current value has already moved to user_bob (a reassignment made
    // earlier in the same edit session) — and Bob also isn't in the current
    // search page. The trigger must not show "Alice" for Bob's UID.
    render(
      <ShowIssueOwnerField
        studioId="std_1"
        value="user_bob"
        onChange={vi.fn()}
        initialOwnerId="user_alice"
        initialLabel="Alice"
      />,
    );

    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveTextContent('Select option...');
  });

  it('falls back to the placeholder when no value is selected', () => {
    mockUseStudioMembers.mockReturnValue({ data: { data: [] }, isLoading: false });

    render(
      <ShowIssueOwnerField studioId="std_1" value="" onChange={vi.fn()} />,
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Unassigned — search studio members...');
  });
});
