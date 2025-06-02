import { DateRangePicker } from "@/components/date-range-picker";
import { FullPage } from "@/components/hoc/full-page";
import { PaginatedDataTable } from "@/components/paginated-data-table";
import { useShows } from "@/livestream/shows/hooks/use-shows";
import { useShowsColumns } from "@/livestream/shows/hooks/use-shows-columns";

const ShowsPage: React.FC = () => {
  const { data, isPending, isError, error } = useShows();
  const columns = useShowsColumns();

  return (
    <>
      <div className="p-4 pb-0">
        <label className="inline-flex items-center gap-2">
          <span>Range</span>
          <DateRangePicker />
        </label>
      </div>
      <PaginatedDataTable
        className="max-h-show-content-area"
        columns={columns}
        data={data}
        error={error}
        isLoading={isPending}
        isError={isError}
      />
    </>
  );
};

export const ShowsFullPage = FullPage(ShowsPage);

export default ShowsFullPage;
