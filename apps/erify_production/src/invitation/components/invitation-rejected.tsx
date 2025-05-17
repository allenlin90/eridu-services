import { ROUTES } from "@/constants/routes";
import { Button } from "@eridu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@eridu/ui/components/card";
import { X } from "lucide-react";
import { Link } from "react-router";

type InvitationRejectedProps = {
  organizationName: string;
};

export const InvitationRejected: React.FC<InvitationRejectedProps> = ({ organizationName }) => {
  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Invitation Declined</CardTitle>
          <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
            <X className="h-6 w-6 text-gray-600" />
          </div>
        </div>
        <CardDescription>
          You've declined the invitation to join
          {organizationName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          The invitation has been declined. If this was a mistake, please contact the person who invited you.
        </p>
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

export default InvitationRejected;
