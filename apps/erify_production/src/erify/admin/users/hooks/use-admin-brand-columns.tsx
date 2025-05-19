import type { Brand } from "@/erify/types";
import type { ColumnDef } from "@tanstack/react-table";

import { RowActions } from "@eridu/ui/components/table/row-actions";
import { useCallback, useMemo } from "react";

export const useAdminBrandColumns = (): ColumnDef<Brand>[] => {
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
          const user = row.original;
          return (
            <RowActions actions={[{
              name: "Copy ID",
              onClick: copyId(user.uid),
            }]}
            />
          );
        },
      },
    ];
  }, [copyId]);
};
