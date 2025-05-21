import { FullPage } from "@/components/hoc/full-page";
import { PaginatedDataTable } from "@/components/paginated-data-table";
import { AddShowModal } from "@/erify/admin/shows/components/add-show-modal";
import { Dialogs } from "@/erify/admin/shows/components/dialogs";
import { ShowSearchFilters } from "@/erify/admin/shows/components/show-search-filters";
import { useAdminShowColumns } from "@/erify/admin/shows/hooks/use-admin-show-columns";
import { useQueryShows } from "@/erify/admin/shows/hooks/use-query-shows";

const Shows: React.FC = () => {
  const { data, error, isPending, isError } = useQueryShows();
  const columns = useAdminShowColumns();

  return (
    <div className="h-full p-4 pb-0 flex flex-col">
      <div className="max-w-full flex flex-col sm:flex-row gap-4 mb-4 sm:mb-0">
        <ShowSearchFilters className="w-full order-2 sm:order-1">
          <AddShowModal />
        </ShowSearchFilters>
        <AddShowModal buttonProps={{ className: "sm:hidden" }} />
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

export const ShowsPage = FullPage(Shows);

export default ShowsPage;
