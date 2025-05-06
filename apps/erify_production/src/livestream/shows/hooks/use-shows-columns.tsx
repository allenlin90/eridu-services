import type { ShowTableRow } from "@/livestream/shows/types/show-table-row";
import type { ColumnDef } from "@tanstack/react-table";

import { RowActions } from "@/components/row-actions";
import { ROUTES } from "@/constants/routes";
import { toLocaleDateString, toLocaleTimeString } from "@/utils";
import { DropdownMenuItem } from "@eridu/ui/components/dropdown-menu";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";

export const useShowsColumns = (): ColumnDef<ShowTableRow>[] => {
  const navigate = useNavigate();
  const copyId = useCallback(
    (show_uid: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigator.clipboard.writeText(show_uid);
      },
    [],
  );
  const toShowDetails = useCallback(
    (show_uid: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigate(ROUTES.LIVESTREAM.SHOW_DETAILS(show_uid));
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
        accessorKey: "brand",
        header: "Brand",
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ cell }) => <div className="text-nowrap">{cell.getValue<string>()}</div>,
      },
      {
        accessorKey: "studio_room",
        header: () => <div className="text-nowrap">Studio Room</div>,
      },
      {
        accessorKey: "uid",
        header: "Show ID",
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const show = row.original;
          const actions = [
            { name: "Copy ID", onClick: copyId(show.uid) },
          ];

          return (
            <RowActions actions={actions}>
              <DropdownMenuItem onClick={toShowDetails(show.uid)}>
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
