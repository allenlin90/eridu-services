import { Building2 } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import type { Team } from '@eridu/ui';

import { type CreatorStudioCreator, useActiveStudio } from '@/lib/hooks/use-active-studio';

export function useCreatorStudios() {
  const { activeStudio, studios, switchStudio, activeStudioId } = useActiveStudio();

  // Map studio roster associations to Team objects for the TeamSwitcher
  const teams: Team[] = useMemo(() => {
    return studios.map((sc: CreatorStudioCreator) => ({
      name: sc.studio.name,
      logo: Building2, // Default logo for now
      plan: sc.is_active ? 'Active Roster' : 'Inactive', // Display status as plan description
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
      const selectedAssociation = studios.find(
        (sc: CreatorStudioCreator) => sc.studio.name === team.name,
      );

      if (selectedAssociation) {
        switchStudio(selectedAssociation.studio.uid);
      }
    },
    [studios, switchStudio],
  );

  return {
    teams,
    activeTeam,
    activeStudio,
    activeStudioId,
    handleTeamChange,
  };
}
