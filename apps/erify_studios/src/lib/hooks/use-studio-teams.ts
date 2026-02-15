import { Building2 } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import type { Team } from '@eridu/ui';

import type { Membership } from '@/lib/hooks/use-active-studio';
import { useActiveStudio } from '@/lib/hooks/use-active-studio';

export function useStudioTeams() {
  const { activeStudio, studios, switchStudio } = useActiveStudio();

  // Map studio memberships to Team objects for the switcher
  const teams: Team[] = useMemo(() => {
    return studios.map((membership: Membership) => ({
      name: membership.studio.name,
      logo: Building2, // Default logo for now
      plan: membership.role, // Display role as "plan"
    }));
  }, [studios]);

  // Find the active team object
  const activeTeam = useMemo(() => {
    if (!activeStudio) {
      return teams[0];
    }
    return teams.find((t) => t.name === activeStudio.studio.name) || teams[0];
  }, [activeStudio, teams]);

  const handleTeamChange = useCallback(
    (team: Team) => {
      // Find the membership corresponding to the selected team
      const selectedMembership = studios.find(
        (m: Membership) => m.studio.name === team.name,
      );

      if (selectedMembership) {
        switchStudio(selectedMembership.studio.uid);
      }
    },
    [studios, switchStudio],
  );

  return {
    teams,
    activeTeam,
    activeStudio,
    handleTeamChange,
  };
}
