import type { ColumnDef } from "@tanstack/react-table";

import { RowActions } from "@/components/row-actions";
import { ROUTES } from "@/constants/routes";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";

import type { User } from "../types";

export const useAdminUserColumns = (): ColumnDef<User>[] => {
  const navigate = useNavigate();

  const toUserDetails = useCallback(
    (user_uid: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigate(ROUTES.ERIFY.ADMIN.USER_DETAILS(user_uid));
      },
    [navigate],
  );

  return useMemo(() => {
    return [
      {
        accessorKey: "uid",
        header: "ID",
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        accessorKey: "clerk_uid",
        header: "Alias ID",
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <RowActions actions={[{
              name: "Details",
              onClick: toUserDetails(user.uid),
            }]}
            />
          );
        },
      },
    ];
  }, [toUserDetails]);
};

export default useAdminUserColumns;
