import type { MC } from "@/erify/types";
import type { ColumnDef } from "@tanstack/react-table";

import { useRowActionStore } from "@/erify/admin/mcs/stores/use-row-action-store";
import { RowActions } from "@eridu/ui/components/table/row-actions";
import { Square, SquareCheck } from "lucide-react";
import { useCallback, useMemo } from "react";

export const useAdminMcColumns = (): ColumnDef<MC>[] => {
  const openDialog = useRowActionStore(state => state.openDialog);
  const copyId = useCallback(
    (mc_id: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigator.clipboard.writeText(mc_id);
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
        accessorKey: "ranking",
        header: "Ranking",
      },
      {
        accessorKey: "is_banned",
        header: "Is Banned?",
        cell: ({ row }) => {
          const emailVerified = row.original.banned;
          return emailVerified ? <SquareCheck /> : <Square />;
        },
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
                  onClick: copyId(mc.id),
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
