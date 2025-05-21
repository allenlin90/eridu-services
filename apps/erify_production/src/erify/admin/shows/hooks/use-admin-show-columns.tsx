import type { Show } from "@/erify/types";
import type { ColumnDef } from "@tanstack/react-table";

import { useRowActionStore } from "@/erify/admin/shows/stores/use-row-action-store";
import { RowActions } from "@eridu/ui/components/table/row-actions";
import { format } from "date-fns";
import { useCallback, useMemo } from "react";

export const useAdminShowColumns = (): ColumnDef<Show>[] => {
  const { openDialog } = useRowActionStore();
  const copyId = useCallback(
    (show_id: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigator.clipboard.writeText(show_id);
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
        accessorKey: "brand_uid",
        header: "Brand ID",
      },
      {
        accessorKey: "start_time",
        header: "Start Time",
        cell: ({ row }) => {
          const show = row.original;
          return format(show.start_time, "dd/MMM/yyyy HH:mm");
        },
      },
      {
        accessorKey: "end_time",
        header: "End Time",
        cell: ({ row }) => {
          const show = row.original;
          return format(show.end_time, "dd/MMM/yyyy HH:mm");
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const show = row.original;
          return (
            <RowActions
              modal={false}
              actions={[
                {
                  name: "Copy ID",
                  onClick: copyId(show.uid),
                },
                {
                  name: "Update show",
                  onClick: () => openDialog("update_show", show),
                },
                {
                  name: "Remove show",
                  onClick: () => openDialog("remove_show", show),
                },
              ]}
            />
          );
        },
      },
    ];
  }, [copyId, openDialog]);
};
