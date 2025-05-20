import FullPage from "@/components/hoc/full-page";
import { PaginatedDataTable } from "@/components/paginated-data-table";
import { AddStudioModal } from "@/erify/admin/studios/components/add-studio-modal";
import { Dialogs } from "@/erify/admin/studios/components/dialogs";
import { StudioSearchFilters } from "@/erify/admin/studios/components/studio-search-filters";
import { useAdminStudioColumns } from "@/erify/admin/studios/hooks/use-admin-studio-columns";
import { useQueryStudios } from "@/erify/admin/studios/hooks/use-query-studios";

const Studios: React.FC = () => {
  const { data, error, isPending, isError } = useQueryStudios();
  const columns = useAdminStudioColumns();

  return (
    <div className="h-full p-4 pb-0 flex flex-col">
      <div className="max-w-full flex flex-col sm:flex-row gap-4 mb-4 sm:mb-0">
        <StudioSearchFilters className="w-full order-2 sm:order-1" />
        <AddStudioModal />
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

export const StudiosPage = FullPage(Studios);

export default StudiosPage;
