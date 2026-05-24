import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useActiveStudio } from '../use-active-studio';
import { useCreatorStudios } from '../use-creator-studios';

// Mock useActiveStudio
vi.mock('../use-active-studio', () => ({
  useActiveStudio: vi.fn(),
}));

describe('useCreatorStudios', () => {
  it('correctly maps active creator studios to TeamSwitcher props', () => {
    const mockSwitchStudio = vi.fn();

    vi.mocked(useActiveStudio).mockReturnValue({
      studios: [
        {
          studio: { uid: 'std_1', name: 'Studio One' },
          is_active: true,
        },
        {
          studio: { uid: 'std_2', name: 'Studio Two' },
          is_active: true,
        },
      ],
      activeStudio: {
        studio: { uid: 'std_1', name: 'Studio One' },
        is_active: true,
      },
      activeStudioId: 'std_1',
      switchStudio: mockSwitchStudio,
    } as any);

    const { result } = renderHook(() => useCreatorStudios());

    // Should map studios to teams correctly
    expect(result.current.teams.length).toBe(2);
    expect(result.current.teams[0].name).toBe('Studio One');
    expect(result.current.teams[0].plan).toBe('Active Roster');
    expect(result.current.teams[1].name).toBe('Studio Two');

    // Should resolve activeTeam
    expect(result.current.activeTeam?.name).toBe('Studio One');

    // Should invoke switchStudio when selection changes
    act(() => {
      result.current.handleTeamChange(result.current.teams[1]);
    });

    expect(mockSwitchStudio).toHaveBeenCalledWith('std_2');
  });
});
