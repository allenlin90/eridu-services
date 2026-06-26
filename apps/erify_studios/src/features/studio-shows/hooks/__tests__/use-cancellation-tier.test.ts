import { describe, expect, it, vi } from 'vitest';

import { useCancellationTier } from '../use-cancellation-tier';

import { useDutyManager } from '@/features/studio-shifts/hooks/use-studio-shifts';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';
import { useUserProfile } from '@/lib/hooks/use-user';

vi.mock('@/lib/hooks/use-studio-access', () => ({
  useStudioAccess: vi.fn(),
}));
vi.mock('@/lib/hooks/use-user', () => ({
  useUserProfile: vi.fn(),
}));
vi.mock('@/features/studio-shifts/hooks/use-studio-shifts', () => ({
  useDutyManager: vi.fn(),
}));

describe('useCancellationTier', () => {
  it('returns manager when the role is ADMIN or MANAGER, without needing the duty-manager query', () => {
    vi.mocked(useStudioAccess).mockReturnValue({ role: 'admin', isLoading: false } as any);
    vi.mocked(useUserProfile).mockReturnValue({ data: { uid: 'user_self_uid', ext_id: 'ext_self_id', id: 'ext_self_id' }, isLoading: false } as any);
    vi.mocked(useDutyManager).mockReturnValue({ data: null, isLoading: false } as any);

    const result = useCancellationTier('studio_1');

    expect(result.tier).toBe('manager');
  });

  it('returns duty_manager when the current user matches the active duty manager', () => {
    vi.mocked(useStudioAccess).mockReturnValue({ role: 'member', isLoading: false } as any);
    vi.mocked(useUserProfile).mockReturnValue({ data: { uid: 'user_self_uid', ext_id: 'ext_self_id', id: 'ext_self_id' }, isLoading: false } as any);
    vi.mocked(useDutyManager).mockReturnValue({ data: { user_id: 'user_self_uid' }, isLoading: false } as any);

    const result = useCancellationTier('studio_1');

    expect(result.tier).toBe('duty_manager');
  });

  it('returns null when the user is neither a manager nor the active duty manager', () => {
    vi.mocked(useStudioAccess).mockReturnValue({ role: 'member', isLoading: false } as any);
    vi.mocked(useUserProfile).mockReturnValue({ data: { uid: 'user_self_uid', ext_id: 'ext_self_id', id: 'ext_self_id' }, isLoading: false } as any);
    vi.mocked(useDutyManager).mockReturnValue({ data: { user_id: 'user_other_uid' }, isLoading: false } as any);

    const result = useCancellationTier('studio_1');

    expect(result.tier).toBeNull();
  });

  it('is loading while any of the three underlying queries are loading', () => {
    vi.mocked(useStudioAccess).mockReturnValue({ role: 'member', isLoading: true } as any);
    vi.mocked(useUserProfile).mockReturnValue({ data: undefined, isLoading: true } as any);
    vi.mocked(useDutyManager).mockReturnValue({ data: undefined, isLoading: true } as any);

    const result = useCancellationTier('studio_1');

    expect(result.isLoading).toBe(true);
  });
});
