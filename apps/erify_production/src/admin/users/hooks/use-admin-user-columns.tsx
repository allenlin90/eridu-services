import type { UserWithRole } from "@eridu/auth-service/types";
import type { ColumnDef } from "@tanstack/react-table";

import { UsersTableRowActions } from "@/admin/users/components/users-table-row-actions";
import { Square, SquareCheck } from "lucide-react";
import { useMemo } from "react";

export const useAdminUserColumns = (): ColumnDef<UserWithRole>[] => {
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
        accessorKey: "role",
        header: "Role",
      },
      {
        accessorKey: "banned",
        header: "Banned",
        cell: ({ row }) => {
          const banned = row.original.banned;
          return banned ? <SquareCheck /> : <span>-</span>;
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const user = row.original;
          return <UsersTableRowActions user={user} />;
        },
      },
    ];
  }, []);
};

export default useAdminUserColumns;
