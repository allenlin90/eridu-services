import { FullPage } from "@/components/hoc/full-page";
import { Pagination } from "@/components/pagination";
import { useColumns } from "@/shows/hooks/use-columns";
import { useShows } from "@/shows/hooks/use-shows";
import { DataTable } from "@eridu/ui/components/data-table";
import { LoaderCircle } from "lucide-react";

// TODO: allow users to change the limit
const LIMIT = 10;

const ShowsPage: React.FC = () => {
  const { data, isPending, isError, error } = useShows();
  const columns = useColumns();

  if (isPending) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div>
          <LoaderCircle className="animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return <p>{error.message}</p>;
  }

  const page = Math.ceil(data.offset / data.limit) + 1;

  return (
    <>
      <div className="max-w-full p-4 overflow-auto h-full max-h-show-content-area">
        <DataTable columns={columns} data={data.data} />
      </div>
      <div className="min-w-full max-w-full p-4">
        <Pagination pageSize={LIMIT} page={page} total={data.total} />
      </div>
    </>
  );
};

export const ShowsFullPage = FullPage(ShowsPage);

export default ShowsFullPage;
