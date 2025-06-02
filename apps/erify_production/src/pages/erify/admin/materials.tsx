import { FullPage } from "@/components/hoc/full-page";
import { PaginatedDataTable } from "@/components/paginated-data-table";
import { Dialogs } from "@/erify/admin/materials/components/dialogs";
import { AddMaterialModal } from "@/erify/admin/materials/components/dialogs/add-material-modal";
import { MaterialSearchFilters } from "@/erify/admin/materials/components/material-search-filters";
import { useAdminMaterialColumns } from "@/erify/admin/materials/hooks/use-admin-material-columns";
import { useQueryMaterials } from "@/erify/admin/materials/hooks/use-query-materials";

const Materials: React.FC = () => {
  const { data, error, isPending, isError } = useQueryMaterials();
  const columns = useAdminMaterialColumns();

  return (
    <div className="h-full p-4 pb-0 flex flex-col">
      <div className="max-w-full flex flex-col sm:flex-row gap-4 mb-4 sm:mb-0">
        <MaterialSearchFilters className="w-full order-2 sm:order-1" />
        <AddMaterialModal />
      </div>
      <PaginatedDataTable
        columns={columns}
        data={data}
        error={error}
        isLoading={isPending}
        isError={isError}
      />
      <Dialogs />
    </div>
  );
};

export const MaterialsPage = FullPage(Materials);

export default MaterialsPage;
