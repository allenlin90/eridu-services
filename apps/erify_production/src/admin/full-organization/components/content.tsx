import type { Organization } from "@/admin/full-organization/types";

import { MembersTable } from "@/admin/full-organization/components/members-table";
import { Settings } from "@/admin/full-organization/components/settings";
import { TeamsTable } from "@/admin/full-organization/components/teams-table";
import { Button } from "@eridu/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@eridu/ui/components/tabs";
import { Plus } from "lucide-react";
import React, { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

type ContentProps = { organization: Organization };

export const Content: React.FC<ContentProps> = ({ organization }) => {
  const { members, teams } = organization;
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = useMemo(() => searchParams.get("tab"), [searchParams]);
  const onValueChange = useCallback((tab: string) =>
    setSearchParams(new URLSearchParams([["tab", tab]])), [setSearchParams]);

  const getTeamName = useCallback((teamId?: string) => {
    const team = organization.teams.find(team => team.id === teamId);
    return team ? team.name : "Unknown Team";
  }, [organization]);

  return (
    <Tabs className="w-full" value={tab || "members"} onValueChange={onValueChange}>
      <TabsList className="grid grid-cols-3 md:w-fit">
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="teams">Teams</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="members" className="flex flex-col gap-4">
        <div className="flex justify-start sm:justify-between items-start sm:items-center flex-col sm:flex-row gap-2">
          <h2 className="text-xl font-semibold">Organization Members</h2>
          <Button className="w-full sm:w-min">
            <Plus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </div>
        <MembersTable members={members} getTeamName={getTeamName} />
      </TabsContent>
      <TabsContent value="teams">
        <TeamsTable teams={teams} />
      </TabsContent>
      <TabsContent value="settings">
        <Settings organization={organization} getTeamName={getTeamName} />
      </TabsContent>
    </Tabs>
  );
};
