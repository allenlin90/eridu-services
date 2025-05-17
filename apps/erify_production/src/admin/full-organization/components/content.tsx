import { MembersHeader } from "@/admin/full-organization/components/members/members-header";
import { MembersTable } from "@/admin/full-organization/components/members/members-table";
import { Settings } from "@/admin/full-organization/components/settings/settings";
import { TeamsHeader } from "@/admin/full-organization/components/teams/teams-header";
import { TeamsTable } from "@/admin/full-organization/components/teams/teams-table";
import { useFullOrganization } from "@/admin/full-organization/hooks/use-full-organization";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@eridu/ui/components/tabs";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

export const Content: React.FC = () => {
  const { organization } = useFullOrganization();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = useMemo(() => searchParams.get("tab"), [searchParams]);
  const onValueChange = useCallback((tab: string) =>
    setSearchParams(new URLSearchParams([["tab", tab]])), [setSearchParams]);

  const getTeamName = useCallback((teamId?: string) => {
    const team = organization.teams.find(team => team.id === teamId);
    return team ? team.name : "Unknown Team";
  }, [organization.teams]);

  return (
    <Tabs className="w-full" value={tab || "members"} onValueChange={onValueChange}>
      <TabsList className="grid grid-cols-3 md:w-fit">
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="teams">Teams</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="members" className="flex flex-col gap-4">
        <MembersHeader />
        <MembersTable
          organization={organization}
          getTeamName={getTeamName}
        />
      </TabsContent>
      <TabsContent value="teams" className="flex flex-col gap-4">
        <TeamsHeader />
        <TeamsTable teams={organization.teams} />
      </TabsContent>
      <TabsContent value="settings">
        <Settings organization={organization} getTeamName={getTeamName} />
      </TabsContent>
    </Tabs>
  );
};
