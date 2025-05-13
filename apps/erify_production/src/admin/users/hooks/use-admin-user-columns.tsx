import type { User } from "@eridu/auth-service/types";
import type { ColumnDef } from "@tanstack/react-table";

import { RowActions } from "@eridu/ui/components/table/row-actions";
import { Square, SquareCheck } from "lucide-react";
import { useCallback, useMemo } from "react";

export const useAdminUserColumns = (): ColumnDef<User>[] => {
  const copyUserId = useCallback(
    (user_uid: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigator.clipboard.writeText(user_uid);
      },
    [],
  );

  return useMemo(() => {
    return [
      {
        accessorKey: "id",
        header: "ID",
      },
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        accessorKey: "emailVerified",
        header: "Email Verified",
        cell: ({ row }) => {
          const emailVerified = row.original.emailVerified;
          return emailVerified ? <SquareCheck /> : <Square />;
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const user = row.original;
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

          return (
            <RowActions actions={actions} />
          );
        },
      },
    ];
  }, [copyUserId]);
};

export default useAdminUserColumns;
