import type { UserWithRole } from "@eridu/auth-service/types";

import { RowActions } from "@eridu/ui/components/table/row-actions";
import { useToast } from "@eridu/ui/hooks/use-toast";
import { useCallback } from "react";

type UsersTableRowActionsProps = {
  user: UserWithRole;
};

export const UsersTableRowActions: React.FC<UsersTableRowActionsProps> = ({ user }) => {
  const { toast } = useToast();
  const copyUserId = useCallback(
    (user_uid: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigator.clipboard.writeText(user_uid);
        toast({
          variant: "success",
          description: `User ID: ${user_uid} is copied`,
        });
      },
    [toast],
  );

  const actions = [
    { name: "Copy ID", onClick: copyUserId(user.id) },
    // TODO: ban user
    // TODO: unban user
    // TODO: remove user
    // TODO: revoke sessions of a user
    // TODO: reset user password
    // TODO: set user role
    // TODO: send verification email
    // TODO: impersonate user
    // TODO: stop impersonating user
  ];

  return <RowActions actions={actions} />;
};

export default UsersTableRowActions;
