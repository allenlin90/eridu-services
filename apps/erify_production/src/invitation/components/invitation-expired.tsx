import type { InvitationWithOrganization } from "@eridu/auth-service/types";

import { ROUTES } from "@/constants/routes";
import { Button } from "@eridu/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@eridu/ui/components/card";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { Link } from "react-router";

type InvitationExpiredProps = Pick<InvitationWithOrganization, "organizationName" | "expiresAt">;

export const InvitationExpired: React.FC<InvitationExpiredProps> = ({
  organizationName,
  expiresAt,
}) => {
  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Invitation Expired</CardTitle>
          <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Clock className="h-6 w-6 text-gray-600" />
          </div>
        </div>
        <CardDescription>This invitation is no longer valid</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          The invitation to join
          {" "}
          {organizationName}
          {" "}
          has expired. Please contact the organization admin
          to request a new invitation.
        </p>
        <div className="mt-4 text-sm text-muted-foreground">
          <div>
            Expired on:
            {format(expiresAt, "MMMM d, yyyy 'at' h:mm a")}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <Link to={ROUTES.DASHBOARD}>
            Return to Home
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InvitationExpired;
