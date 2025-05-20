import type { Studio } from "@/erify/types";
import type { ColumnDef } from "@tanstack/react-table";

import { useRowActionStore } from "@/erify/admin/studios/stores/use-row-action-store";
import { RowActions } from "@eridu/ui/components/table/row-actions";
import { useCallback, useMemo } from "react";

export const useAdminStudioColumns = (): ColumnDef<Studio>[] => {
  const openDialog = useRowActionStore(state => state.openDialog);
  const copyId = useCallback(
    (studioUid: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigator.clipboard.writeText(studioUid);
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
          const studio = row.original;
          return (
            <RowActions
              modal={false}
              actions={[
                {
                  name: "Copy ID",
                  onClick: copyId(studio.uid),
                },
                {
                  name: "Update studio",
                  onClick: () => openDialog("update_studio", studio),
                },
                {
                  name: "Remove studio",
                  className: "text-destructive",
                  onClick: () => openDialog("remove_studio", studio),
                },
              ]}
            />
          );
        },
      },
    ];
  }, [copyId, openDialog]);
};
