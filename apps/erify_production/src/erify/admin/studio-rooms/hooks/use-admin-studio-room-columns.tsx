import type { StudioRoom } from "@/erify/types";
import type { ColumnDef } from "@tanstack/react-table";

import { useRowActionStore } from "@/erify/admin/studio-rooms/stores/use-row-action-store";
import { RowActions } from "@eridu/ui/components/table/row-actions";
import { useCallback, useMemo } from "react";

export const useAdminStudioRoomColumns = (): ColumnDef<StudioRoom>[] => {
  const { openDialog } = useRowActionStore();

  const copyId = useCallback(
    (studioRoomId: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigator.clipboard.writeText(studioRoomId);
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
          const studioRoom = row.original;
          return (
            <RowActions
              modal={false}
              actions={[
                {
                  name: "Copy ID",
                  onClick: copyId(studioRoom.uid),
                },
                {
                  name: "Update",
                  onClick: () => openDialog("update_studio_room", studioRoom),
                },
                {
                  name: "Remove",
                  className: "text-destructive",
                  onClick: () => openDialog("remove_studio_room", studioRoom),
                },
              ]}
            />
          );
        },
      },
    ];
  }, [copyId, openDialog]);
};

export default useAdminStudioRoomColumns;
