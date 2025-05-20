import type { User } from "@/erify/types";
import type { ColumnDef } from "@tanstack/react-table";

import { RowActions } from "@eridu/ui/components/table/row-actions";
import { useCallback, useMemo } from "react";

import { useRowActionStore } from "../stores/use-row-action-store";

export const useAdminUserColumns = (): ColumnDef<User>[] => {
  const { openDialog } = useRowActionStore();

  const copyId = useCallback(
    (user_id: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigator.clipboard.writeText(user_id);
      },
    [],
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
        accessorKey: "ext_uid",
        header: "Alias ID",
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <RowActions
              modal={false}
              actions={[
                {
                  name: "Copy ID",
                  onClick: copyId(user.uid),
                },
                {
                  name: "Update",
                  onClick: () => openDialog("update_user", user),
                },
                {
                  name: "Remove",
                  className: "text-destructive",
                  onClick: () => openDialog("remove_user", user),
                },
              ]}
            />
          );
        },
      },
    ];
  }, [copyId, openDialog]);
};

export default useAdminUserColumns;
