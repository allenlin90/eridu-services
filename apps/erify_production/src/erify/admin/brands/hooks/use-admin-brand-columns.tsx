import type { Brand } from "@/erify/types";
import type { ColumnDef } from "@tanstack/react-table";

import { RowActions } from "@eridu/ui/components/table/row-actions";
import { useCallback, useMemo } from "react";

import { useRowActionStore } from "../stores/use-row-action-store";

export const useAdminBrandColumns = (): ColumnDef<Brand>[] => {
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
        id: "actions",
        cell: ({ row }) => {
          const brand = row.original;
          return (
            <RowActions
              modal={false}
              actions={[
                {
                  name: "Copy ID",
                  onClick: copyId(brand.uid),
                },
                {
                  name: "Update brand",
                  onClick: () => openDialog("update_brand", brand),
                },
                {
                  name: "Remove brand",
                  className: "text-destructive",
                  onClick: () => openDialog("remove_brand", brand),
                },
              ]}
            />
          );
        },
      },
    ];
  }, [copyId, openDialog]);
};
