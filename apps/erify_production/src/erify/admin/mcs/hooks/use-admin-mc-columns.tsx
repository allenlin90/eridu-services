import type { MC } from "@/erify/types";
import type { ColumnDef } from "@tanstack/react-table";

import { useRowActionStore } from "@/erify/admin/mcs/stores/use-row-action-store";
import { RowActions } from "@eridu/ui/components/table/row-actions";
import { useCallback, useMemo } from "react";

export const useAdminMcColumns = (): ColumnDef<MC>[] => {
  const openDialog = useRowActionStore(state => state.openDialog);
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
        accessorKey: "name",
        header: "Name",
      },
      {
        accessorKey: "user_uid",
        header: "User ID",
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const mc = row.original;

          return (
            <RowActions
              modal={false}
              actions={[
                {
                  name: "Copy ID",
                  onClick: copyId(mc.uid),
                },
                {
                  name: "Update mc",
                  onClick: () => openDialog("update_mc", mc),
                },
                {
                  name: "Remove mc",
                  className: "text-destructive",
                  onClick: () => openDialog("remove_mc", mc),
                },
              ]}
            />
          );
        },
      },
    ];
  }, [copyId, openDialog]);
};
