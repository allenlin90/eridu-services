import { FullPage } from "@/components/hoc/full-page";
import { PaginatedDataTable } from "@/components/paginated-data-table";
import { useAdminShowColumns } from "@/erify/admin/shows/hooks/use-admin-show-columns";
import { useQueryShows } from "@/erify/admin/shows/hooks/use-query-shows";

const Shows: React.FC = () => {
  const { data, error, isPending, isError } = useQueryShows();
  const columns = useAdminShowColumns();

  return (
    <div className="h-full p-4 pb-0 flex flex-col">
      <PaginatedDataTable
        columns={columns}
        data={data}
        error={error}
        isLoading={isPending}
        isError={isError}
      />
    </div>
  );
};

export const ShowsPage = FullPage(Shows);

export default ShowsPage;
