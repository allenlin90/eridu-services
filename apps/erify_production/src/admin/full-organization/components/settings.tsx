import type { FullOrganization } from "@/admin/full-organization/components/full-organization";

import { InvitationsTable } from "@/admin/full-organization/components/invitations-table";
import { Button } from "@eridu/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@eridu/ui/components/card";

type Organization = React.ComponentProps<typeof FullOrganization>["organization"];

type SettingsProps = {
  organization: Organization;
  getTeamName: (teamId?: string) => string;
};

export const Settings: React.FC<SettingsProps> = ({ organization, getTeamName }) => {
  const invitations = organization.invitations;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
        <CardDescription>Manage your organization preferences</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="space-y-2 order-2 sm:order-1">
          <h3 className="font-medium">Danger Zone</h3>
          <div className="border border-destructive/20 rounded-md p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h4 className="font-medium text-destructive">Delete Organization</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this organization and all associated data
                </p>
              </div>
              <Button variant="destructive">Delete Organization</Button>
            </div>
          </div>
        </div>
        <div className="space-y-2 order-1 sm:order-2">
          <h3 className="font-medium">Invitations</h3>
          <InvitationsTable invitations={invitations} getTeamName={getTeamName} />
        </div>
      </CardContent>
    </Card>
  );
};

export default Settings;
