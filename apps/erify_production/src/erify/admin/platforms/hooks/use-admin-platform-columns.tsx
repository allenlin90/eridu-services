import type { Platform } from "@/erify/types";
import type { ColumnDef } from "@tanstack/react-table";

import { useRowActionStore } from "@/erify/admin/platforms/stores/use-row-action-store";
import { RowActions } from "@eridu/ui/components/table/row-actions";
import { useCallback, useMemo } from "react";

export const useAdminPlatformColumns = (): ColumnDef<Platform>[] => {
  const { openDialog } = useRowActionStore();

  const copyId = useCallback(
    (platform_id: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigator.clipboard.writeText(platform_id);
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
                  onClick: () => openDialog("update_platform", user),
                },
                {
                  name: "Remove",
                  className: "text-destructive",
                  onClick: () => openDialog("remove_platform", user),
                },
              ]}
            />
          );
        },
      },
    ];
  }, [copyId, openDialog]);
};

export default useAdminPlatformColumns;
