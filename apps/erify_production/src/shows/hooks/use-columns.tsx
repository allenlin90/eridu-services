import type { ShowTableRow } from "@/shows/types/show-table-row";
import type { ColumnDef } from "@tanstack/react-table";

import { toLocaleDateString, toLocaleTimeString } from "@/utils";
import { Button } from "@eridu/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@eridu/ui/components/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";

export const useColumns = (): ColumnDef<ShowTableRow>[] => {
  const navigate = useNavigate();
  const copyId = useCallback((show_uid: string) => (_e: React.MouseEvent<HTMLDivElement>) => {
    navigator.clipboard.writeText(show_uid);
  }, []);
  const toShowDetails = useCallback((show_uid: string) => (_e: React.MouseEvent<HTMLDivElement>) => {
    navigate(`/shows/${show_uid}`);
  }, [navigate]);

  return useMemo(() => {
    return [
      {
        accessorFn: row => toLocaleDateString(row.start_time),
        header: "Date",
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
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={copyId(show.uid)}
                >
                  Copy ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toShowDetails(show.uid)}>View details</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
  }, [copyId, toShowDetails]);
};
