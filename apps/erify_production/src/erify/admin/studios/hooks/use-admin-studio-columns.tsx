import type { Studio } from "@/erify/types";
import type { ColumnDef } from "@tanstack/react-table";

import { ROUTES } from "@/constants/routes";
import { useRowActionStore } from "@/erify/admin/studios/stores/use-row-action-store";
import { RowActions } from "@eridu/ui/components/table/row-actions";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";

export const useAdminStudioColumns = (): ColumnDef<Studio>[] => {
  const navigate = useNavigate();
  const openDialog = useRowActionStore(state => state.openDialog);
  const goStudioDetails = useCallback(
    (studioId: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigate(ROUTES.ERIFY.ADMIN.STUDIOS_DETAIL(studioId));
      },
    [navigate],
  );
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
        accessorKey: "id",
        header: "ID",
      },
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        accessorKey: "address_id",
        header: "Address ID",
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
                  onClick: copyId(studio.id),
                },
                {
                  name: "Go to Details",
                  onClick: goStudioDetails(studio.id),
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
  }, [copyId, goStudioDetails, openDialog]);
};
