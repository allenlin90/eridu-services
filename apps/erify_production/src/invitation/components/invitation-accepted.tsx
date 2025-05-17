import { ROUTES } from "@/constants/routes";
import { Button } from "@eridu/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@eridu/ui/components/card";
import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router";

type InvitationAcceptedProps = {
  organizationName: string;
};

export const InvitationAccepted: React.FC<InvitationAcceptedProps> = ({ organizationName }) => {
  return (
    <Card className="shadow-lg border-t-4 border-t-green-500">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Invitation Accepted</CardTitle>
          <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
        </div>
        <CardDescription>
          You've successfully joined
          {" "}
          <span className="font-medium">{organizationName}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">
          Welcome to the team! You now have access to all resources shared with your role.
        </p>

        <div className="rounded-md bg-muted p-4">
          <h3 className="font-medium mb-2">Next steps:</h3>
          <ul className="text-sm space-y-2">
            <li className="flex items-start">
              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2 mt-0.5">
                <span className="text-xs text-green-600">1</span>
              </div>
              <span>Complete your profile settings</span>
            </li>
            <li className="flex items-start">
              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2 mt-0.5">
                <span className="text-xs text-green-600">2</span>
              </div>
              <span>Explore your team's projects</span>
            </li>
            <li className="flex items-start">
              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2 mt-0.5">
                <span className="text-xs text-green-600">3</span>
              </div>
              <span>Connect with your team members</span>
            </li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" asChild>
          <Link to={ROUTES.DASHBOARD}>
            Go to Dashboard
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InvitationAccepted;
