import type { Role } from "@eridu/auth-service/types";

import { Badge } from "@eridu/ui/components/badge";
import { Shield, User } from "lucide-react";

export const RoleBadge = ({ role }: { role: Role }) => {
  switch (role) {
    case "admin":
      return (
        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    case "member":
      return (
        <Badge variant="outline">
          <User className="h-3 w-3 mr-1" />
          Member
        </Badge>
      );
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
};

export default RoleBadge;
