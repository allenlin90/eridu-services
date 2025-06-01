import type { ShowTableRow } from "@/livestream/shows/types/show-table-row";
import type { ColumnDef } from "@tanstack/react-table";

import { ROUTES } from "@/constants/routes";
import { toLocaleDateString, toLocaleTimeString } from "@/utils";
import { DropdownMenuItem } from "@eridu/ui/components/dropdown-menu";
import { RowActions } from "@eridu/ui/components/table/row-actions";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";

export const useShowsColumns = (): ColumnDef<ShowTableRow>[] => {
  const navigate = useNavigate();
  const copyId = useCallback(
    (show_id: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigator.clipboard.writeText(show_id);
      },
    [],
  );
  const toShowDetails = useCallback(
    (show_id: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigate(ROUTES.LIVESTREAM.SHOW_DETAILS(show_id));
      },
    [navigate],
  );

  return useMemo(() => {
    return [
      {
        accessorFn: row => row.start_time,
        header: "Date",
        cell: ({ cell }) => toLocaleDateString(cell.getValue<string>()),
      },
      {
        accessorKey: "start_time",
        header: () => <div className="text-nowrap">Start Time</div>,
        cell: ({ cell }) => toLocaleTimeString(cell.getValue<string>()),
      },
      {
        accessorKey: "end_time",
        header: () => <div className="text-nowrap">End Time</div>,
        cell: ({ cell }) => toLocaleTimeString(cell.getValue<string>()),
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ cell }) => <div className="text-nowrap">{cell.getValue<string>()}</div>,
      },
      {
        accessorKey: "studio_room.name",
        header: () => <div className="text-nowrap">Studio Room</div>,
        cell: ({ cell }) => <div className="text-nowrap">{cell.getValue<string>()}</div>,
      },
      {
        accessorKey: "id",
        header: "Show ID",
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const show = row.original;
          const actions = [
            { name: "Copy ID", onClick: copyId(show.id) },
          ];

          return (
            <RowActions actions={actions}>
              <DropdownMenuItem onClick={toShowDetails(show.id)}>
                View details
              </DropdownMenuItem>
            </RowActions>
          );
        },
      },
    ];
  }, [copyId, toShowDetails]);
};

export default useShowsColumns;
