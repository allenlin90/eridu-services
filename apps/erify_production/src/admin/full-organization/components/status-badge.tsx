import type { Invitation } from "@eridu/auth-service/types";

import { Badge } from "@eridu/ui/components/badge";

export const StatusBadge = ({ status }: { status: Invitation["status"] }) => {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
          Pending
        </Badge>
      );
    case "accepted":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Accepted</Badge>;
    case "canceled":
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200">
          Canceled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default StatusBadge;
