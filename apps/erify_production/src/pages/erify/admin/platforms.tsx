import { FullPage } from "@/components/hoc/full-page";
import { PaginatedDataTable } from "@/components/paginated-data-table";
import { AddPlatformModal } from "@/erify/admin/platforms/components/add-platform-modal";
import { Dialogs } from "@/erify/admin/platforms/components/dialogs";
import { PlatformSearchFilters } from "@/erify/admin/platforms/components/platform-search-filters";
import { useAdminPlatformColumns } from "@/erify/admin/platforms/hooks/use-admin-platform-columns";
import { useQueryPlatforms } from "@/erify/admin/platforms/hooks/use-query-platforms";

const Platforms: React.FC = () => {
  const { data, error, isPending, isError } = useQueryPlatforms();
  const columns = useAdminPlatformColumns();

  return (
    <div className="h-full p-4 pb-0 flex flex-col">
      <div className="max-w-full flex flex-col sm:flex-row gap-4 mb-4 sm:mb-0">
        <PlatformSearchFilters className="w-full order-2 sm:order-1" />
        <AddPlatformModal />
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

export const PlatformsPage = FullPage(Platforms);

export default PlatformsPage;
