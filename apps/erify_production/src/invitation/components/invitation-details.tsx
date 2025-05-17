import type { InvitationWithOrganization } from "@eridu/auth-service/types";

import { InvitationAccepted } from "@/invitation/components/invitation-accepted";
import { InvitationExpired } from "@/invitation/components/invitation-expired";
import { InvitationPending } from "@/invitation/components/invitation-pending";
import { InvitationRejected } from "@/invitation/components/invitation-rejected";
import { useState } from "react";

type InvitationDetailsProps = {
  invitation: InvitationWithOrganization;
};

export const InvitationDetails: React.FC<InvitationDetailsProps> = ({ invitation }) => {
  const [status, setStatus] = useState<InvitationWithOrganization["status"]>(invitation.status);
  const expirationDate = invitation.expiresAt;
  const isExpired = expirationDate <= new Date();

  if (isExpired) {
    return (
      <InvitationExpired
        expiresAt={invitation.expiresAt}
        organizationName={invitation.organizationName}
      />
    );
  }

  if (status === "pending") {
    return (
      <InvitationPending
        invitation={invitation}
        setInvitationStatus={setStatus}
      />
    );
  }

  if (status === "accepted") {
    return (
      <InvitationAccepted
        organizationName={invitation.organizationName}
      />
    );
  }

  return (
    <InvitationRejected
      organizationName={invitation.organizationName}
    />
  );
};

export default InvitationDetails;
