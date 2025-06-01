import FullPage from "@/components/hoc/full-page";
import { PaginatedDataTable } from "@/components/paginated-data-table";
import { AddClientModal } from "@/erify/admin/clients/components/add-client-modal";
import { ClientSearchFilters } from "@/erify/admin/clients/components/client-search-filters";
import { Dialogs } from "@/erify/admin/clients/components/dialogs";
import { useAdminClientColumns } from "@/erify/admin/clients/hooks/use-admin-client-columns";
import { useQueryClients } from "@/erify/admin/clients/hooks/use-query-clients";

const Clients: React.FC = () => {
  const { data, error, isPending, isError } = useQueryClients();
  const columns = useAdminClientColumns();

  return (
    <div className="h-full p-4 pb-0 flex flex-col">
      <div className="max-w-full flex flex-col sm:flex-row gap-4 mb-4 sm:mb-0">
        <ClientSearchFilters className="w-full order-2 sm:order-1" />
        <AddClientModal />
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

export const ClientsPage = FullPage(Clients);

export default ClientsPage;
