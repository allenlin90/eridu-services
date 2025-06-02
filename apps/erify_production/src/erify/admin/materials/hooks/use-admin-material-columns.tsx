import type { Material } from "@/erify/types";
import type { ColumnDef } from "@tanstack/react-table";

import { useRowActionStore } from "@/erify/admin/materials/stores/use-row-action-store";
import { RowActions } from "@eridu/ui/components/table/row-actions";
import { Square, SquareCheck } from "lucide-react";
import { useCallback } from "react";

export const useAdminMaterialColumns = (): ColumnDef<Material>[] => {
  const openDialog = useRowActionStore(state => state.openDialog);
  const copyId = useCallback(
    (material_id: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigator.clipboard.writeText(material_id);
      },
    [],
  );

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
      accessorKey: "type",
      header: "Type",
    },
    {
      accessorKey: "is_active",
      header: "Is active?",
      cell: ({ row }) => {
        const emailVerified = row.original.is_active;
        return emailVerified ? <SquareCheck /> : <Square />;
      },
    },
    {
      accessorKey: "client_id",
      header: "Client ID",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const material = row.original;

        return (
          <RowActions
            modal={false}
            actions={[
              {
                name: "Copy ID",
                onClick: copyId(material.id),
              },
              {
                name: "Update material",
                onClick: () => openDialog("update_material", material),
              },
              {
                name: "Remove material",
                className: "text-destructive",
                onClick: () => openDialog("remove_material", material),
              },
            ]}
          />
        );
      },
    },
  ];
};
