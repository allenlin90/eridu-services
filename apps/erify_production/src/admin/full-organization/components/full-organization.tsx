import type { useFullOrganization } from "@/admin/full-organization/hooks/use-full-organization";

import { MembersTable } from "@/admin/full-organization/components/members-table";
import { Settings } from "@/admin/full-organization/components/settings";
import { TeamsTable } from "@/admin/full-organization/components/teams-table";
import { Avatar, AvatarFallback, AvatarImage } from "@eridu/ui/components/avatar";
import { Badge } from "@eridu/ui/components/badge";
import { Button } from "@eridu/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@eridu/ui/components/tabs";
import { format } from "date-fns";
import { Calendar, Copy, Plus } from "lucide-react";
import React, { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

type Organization = NonNullable<ReturnType<typeof useFullOrganization>["data"]>;

type FullOrganizationProps = {
  organization: Organization;
};

type HeaderProps = { organization: Pick<Organization, "id" | "name" | "logo" | "slug" | "createdAt"> };

const Header: React.FC<HeaderProps> = ({ organization }) => {
  const { id, name, slug, logo, createdAt } = organization;

  const onClick: React.MouseEventHandler<HTMLButtonElement>
   = useCallback(() => {
     navigator.clipboard.writeText(organization.id);
   }, [organization.id]);

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16 hidden sm:block">
        <AvatarImage src={logo || ""} alt={name} />
        <AvatarFallback className="text-2xl bg-primary/10">{name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col justify-center max-w-[calc(100vw-3rem)]">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">{name}</h1>
          <Badge variant="outline" className="ml-2">
            {slug}
          </Badge>
        </div>
        <div className="flex items-center text-muted-foreground text-sm mt-1 ">
          <span className="truncate">
            ID:
            {" "}
            {id}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClick}>
            <Copy className="h-3 w-3" />
            <span className="sr-only">Copy ID</span>
          </Button>
        </div>
        <div className="flex items-center text-muted-foreground text-sm mt-1">
          <Calendar className="h-4 w-4 mr-1" />
          Created on
          &nbsp;
          {format(new Date(createdAt), "MMMM d, yyyy")}
        </div>
      </div>
    </div>
  );
};

type ContentProps = { organization: Organization };

const Content: React.FC<ContentProps> = ({ organization }) => {
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

export const FullOrganization: React.FC<FullOrganizationProps> = ({ organization }) => {
  return (
    <div className="flex flex-col gap-4">
      <Header organization={organization} />
      <Content organization={organization} />
    </div>
  );
};
