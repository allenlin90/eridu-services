import type { InvitationWithOrganization, Role } from "@eridu/auth-service/types";

import { RoleBadge } from "@/components/role-badge";
import { Alert, AlertDescription, AlertTitle } from "@eridu/ui/components/alert";
import { Avatar, AvatarFallback } from "@eridu/ui/components/avatar";
import { Button } from "@eridu/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@eridu/ui/components/card";
import { Separator } from "@eridu/ui/components/separator";
import { formatDistanceToNow } from "date-fns";
import { Clock, User } from "lucide-react";
import { useCallback } from "react";

import { useAcceptInvitation } from "../hooks/use-accept-invitation";
import { useRejectInvitation } from "../hooks/use-reject-invitation";

type InvitationPendingProps = {
  invitation: InvitationWithOrganization;
  setInvitationStatus: React.Dispatch<React.SetStateAction<InvitationWithOrganization["status"]>>;
};

export const InvitationPending: React.FC<InvitationPendingProps> = ({
  invitation,
  setInvitationStatus,
}) => {
  const {
    isPending: isAcceptingInvitation,
    mutateAsync: acceptInvitation,
  } = useAcceptInvitation();

  const {
    isPending: isRejectingInvitation,
    mutateAsync: rejectInvitation,
  } = useRejectInvitation();

  const isLoading = isAcceptingInvitation || isRejectingInvitation;

  const handleAccept = useCallback((invitationId: string) =>
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      await acceptInvitation({ invitationId });
      setInvitationStatus("accepted");
    }, [acceptInvitation, setInvitationStatus]);

  const handleDecline = useCallback((invitationId: string) =>
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      await rejectInvitation({ invitationId });
      setInvitationStatus("rejected");
    }, [rejectInvitation, setInvitationStatus]);

  return (
    <Card className="shadow-lg border-t-4 border-t-primary">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Organization Invitation</CardTitle>
        </div>
        <CardDescription>
          You've been invited to join
          {" "}
          <span className="font-medium">{invitation.organizationName}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Invited by</div>
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{invitation.inviterEmail.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{invitation.inviterEmail}</div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">Organization</div>
            <div className="font-medium">{invitation.organizationName}</div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">Your Role</div>
            <div><RoleBadge role={invitation.role as Role} /></div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">Team</div>
            <div className="font-medium">Production</div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">Expires</div>
            <div className="flex items-center text-sm">
              <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
              {formatDistanceToNow(invitation.expiresAt, { addSuffix: true })}
            </div>
          </div>
        </div>

        <Alert variant="outline" className="bg-muted/50">
          <AlertTitle className="flex items-center text-sm font-medium">
            <User className="h-4 w-4 mr-2" />
            What you'll be able to do
          </AlertTitle>
          <AlertDescription className="text-sm mt-2">
            {invitation.role === "admin"
              ? "As an admin, you'll have full access to manage the organization, including members, teams, and settings."
              : "As a member, you'll be able to access projects, collaborate with team members, and participate in organization activities."}
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="flex space-x-2 w-full">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDecline(invitation.id)}
            disabled={isLoading}
          >
            Decline
          </Button>
          <Button
            className="flex-1"
            onClick={handleAccept(invitation.id)}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Accept Invitation"}
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground pt-2">
          By accepting this invitation, you agree to the organization's terms and policies.
        </p>
      </CardFooter>
    </Card>
  );
};

export default InvitationPending;
