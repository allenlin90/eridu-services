import { FullPage } from "@/components/hoc/full-page";
import { ROUTES } from "@/constants/routes";
import { InvitationDetails } from "@/invitation/components/invitation-details";
import { useQueryInvitation } from "@/invitation/hooks/use-query-invitation";
import { Button } from "@eridu/ui/components/button";
import { LoaderCircle } from "lucide-react";
import { Link, useParams } from "react-router";

const Invitation: React.FC = () => {
  const { invitation_id } = useParams();
  const { data, isPending, isError, error } = useQueryInvitation({ invitationId: invitation_id });

  if (isPending) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div>
          <LoaderCircle className="animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return <p>{error.message}</p>;
  }

  if (!data) {
    return (
      <div className="flex-1 flex w-full flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold text-primary">404</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Oops! The invitation you are looking for does not exist or is rejected.
        </p>
        <Button asChild variant="default" className="mt-4">
          <Link to={ROUTES.DASHBOARD}>Go Back Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center items-center p-4">
      <div className="w-full max-w-md">
        <InvitationDetails invitation={data} />
        <p className="text-center text-xs text-muted-foreground mt-4">
          If you have any questions, please contact support@eridu.co
        </p>
      </div>
    </div>
  );
};

export const InvitationPage = FullPage(Invitation);

export default InvitationPage;
