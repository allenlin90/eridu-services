import type { ShowTableRow } from "@/shows/types/show-table-row";
import type { ColumnDef } from "@tanstack/react-table";

import { toLocaleDateString, toLocaleTimeString } from "@/utils";

// TODO: handle with i18n
export const columns: ColumnDef<ShowTableRow>[] = [
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
];
