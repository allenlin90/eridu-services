import type { Client } from "@/erify/types";
import type { ColumnDef } from "@tanstack/react-table";

import { RowActions } from "@eridu/ui/components/table/row-actions";
import { useCallback, useMemo } from "react";

import { useRowActionStore } from "../stores/use-row-action-store";

export const useAdminClientColumns = (): ColumnDef<Client>[] => {
  const openDialog = useRowActionStore(state => state.openDialog);
  const copyId = useCallback(
    (client_id: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigator.clipboard.writeText(client_id);
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
        id: "actions",
        cell: ({ row }) => {
          const client = row.original;
          return (
            <RowActions
              modal={false}
              actions={[
                {
                  name: "Copy ID",
                  onClick: copyId(client.id),
                },
                {
                  name: "Update client",
                  onClick: () => openDialog("update_client", client),
                },
                {
                  name: "Remove client",
                  className: "text-destructive",
                  onClick: () => openDialog("remove_client", client),
                },
              ]}
            />
          );
        },
      },
    ];
  }, [copyId, openDialog]);
};
