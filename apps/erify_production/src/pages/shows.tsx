import { FullPage } from "@/components/hoc/full-page";
import { columns } from "@/shows/components/show-table/column";
import { ShowTable } from "@/shows/components/show-table/show-table";
import { useShows } from "@/shows/hooks/use-shows";
import { LoaderCircle } from "lucide-react";

const ShowsPage: React.FC = () => {
  const { data, isPending, isError, error } = useShows();

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

  return <ShowTable columns={columns} data={data.data} />;
};

export const ShowsFullPage = FullPage(ShowsPage);

export default ShowsFullPage;
