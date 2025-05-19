import { FullPage } from "@/components/hoc/full-page";
import { PaginatedDataTable } from "@/components/paginated-data-table";
import { AddMcModal } from "@/erify/admin/mcs/components/add-mc-modal";
import { Dialogs } from "@/erify/admin/mcs/components/dialogs";
import { McSearchFilters } from "@/erify/admin/mcs/components/mc-search-filters";
import { useAdminMcColumns } from "@/erify/admin/mcs/hooks/use-admin-mc-columns";
import { useQueryMcs } from "@/erify/admin/mcs/hooks/use-query-mcs";

const MCs: React.FC = () => {
  const { data, error, isPending, isError } = useQueryMcs();
  const columns = useAdminMcColumns();

  return (
    <div className="h-full p-4 pb-0 flex flex-col">
      <div className="max-w-full flex flex-col sm:flex-row gap-4 mb-4 sm:mb-0">
        <McSearchFilters className="w-full order-2 sm:order-1" />
        <AddMcModal />
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

export const MCsPage = FullPage(MCs);

export default MCsPage;
