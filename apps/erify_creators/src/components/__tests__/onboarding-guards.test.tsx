import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NoStudioAssociationView, UnlinkedCreatorView } from '../onboarding-guards';

import { authClient } from '@/lib/auth';

// Mock authClient
vi.mock('@/lib/auth', () => ({
  authClient: {
    client: {
      signOut: vi.fn().mockResolvedValue({}),
    },
    redirectToLogin: vi.fn(),
  },
}));

// Mock @/lib/api
vi.mock('@/lib/api', () => ({
  clearAllCaches: vi.fn().mockResolvedValue(undefined),
}));

describe('onboarding Fallback Guards', () => {
  describe('unlinkedCreatorView', () => {
    it('renders unlinked status and profile information', () => {
      render(
        <UnlinkedCreatorView
          userName="Test User"
          userEmail="test@example.com"
          avatarUrl="/test-avatar.jpg"
          onRecheck={async () => {}}
        />,
      );

      expect(screen.getByText('Account Unlinked')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Your account is not yet connected to a Creator Profile/i,
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('src', '/test-avatar.jpg');
    });

    it('triggers recheck handler on status check button click', async () => {
      const user = userEvent.setup();
      const onRecheck = vi.fn().mockResolvedValue(undefined);

      render(
        <UnlinkedCreatorView
          userName="Test User"
          userEmail="test@example.com"
          onRecheck={onRecheck}
        />,
      );

      const checkButton = screen.getByRole('button', { name: /check status again/i });
      await user.click(checkButton);

      expect(onRecheck).toHaveBeenCalledOnce();
    });

    it('triggers logout flow and clear caches on sign out click', async () => {
      const user = userEvent.setup();
      const mockSignOut = vi.mocked(authClient.client.signOut);
      const mockRedirect = vi.mocked(authClient.redirectToLogin);

      render(
        <UnlinkedCreatorView
          userName="Test User"
          userEmail="test@example.com"
          onRecheck={async () => {}}
        />,
      );

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(signOutButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledOnce();
        expect(mockRedirect).toHaveBeenCalledOnce();
      });
    });
  });

  describe('noStudioAssociationView', () => {
    it('renders verification pending status and profile details', () => {
      render(
        <NoStudioAssociationView
          userName="Creator Name"
          userEmail="creator@example.com"
          onRecheck={async () => {}}
        />,
      );

      expect(screen.getByText('Roster Verification Pending')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Your profile is not yet active on any studio rosters/i,
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('Creator Name')).toBeInTheDocument();
      expect(screen.getByText('creator@example.com')).toBeInTheDocument();
    });
  });
});
