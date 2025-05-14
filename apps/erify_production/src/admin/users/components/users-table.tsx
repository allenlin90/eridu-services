import { useAdminUserColumns } from "@/admin/users/hooks/use-admin-user-columns";
import { useQueryUsers } from "@/admin/users/hooks/use-query-users";
import { Pagination } from "@/components/pagination";
import DataTable from "@eridu/ui/components/data-table";
import { LoaderCircle } from "lucide-react";

// TODO: allow users to change the limit
const LIMIT = 10;

export const UsersTable: React.FC = () => {
  const { data, isPending, isError, error } = useQueryUsers();
  const columns = useAdminUserColumns();

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
    return <p className="text-center">{error?.message || "something went wrong"}</p>;
  }

  if (!data) {
    return <p className="text-center">No data</p>;
  }

  const page = "offset" in data && data.offset !== undefined && data.limit !== undefined
    ? Math.ceil(data.offset / data.limit) + 1
    : 1;

  return (
    <>
      <div className="max-w-full overflow-auto h-full max-h-sm-user-content-area sm:max-h-user-content-area">
        <DataTable columns={columns} data={data.users} />
      </div>
      <div className="p-4">
        <Pagination pageSize={LIMIT} page={page} total={data?.total ?? 1} />
      </div>
    </>
  );
};

export default UsersTable;
