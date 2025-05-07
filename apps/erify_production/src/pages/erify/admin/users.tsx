import { UserSearchFilters } from "@/admin/users/components/user-search-filters";
import { useAdminUserColumns } from "@/admin/users/hooks/use-admin-user-columns";
import { useUsers } from "@/admin/users/hooks/use-users";
import FullPage from "@/components/hoc/full-page";
import { Pagination } from "@/components/pagination";
import DataTable from "@eridu/ui/components/data-table";
import { LoaderCircle } from "lucide-react";

// TODO: allow users to change the limit
const LIMIT = 10;

const UsersPageContent: React.FC = () => {
  const { isLoading, data, isError, error } = useUsers();
  const columns = useAdminUserColumns();

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div>
          <LoaderCircle className="animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return <p>{error?.message || "something went wrong"}</p>;
  }

  const page = data ? Math.ceil(data.offset / data.limit) + 1 : 1;

  return (
    <>
      <div className="max-w-full overflow-auto h-full max-h-user-content-area">
        {
          data
            ? <DataTable columns={columns} data={data.data} />
            : <p className="text-center">No data</p>
        }
      </div>
      <div className="p-4">
        <Pagination pageSize={LIMIT} page={page} total={data?.total ?? 1} />
      </div>
    </>
  );
};

const Users: React.FC = () => {
  return (
    <div className="h-full p-4 pb-0 flex flex-col">
      <UserSearchFilters />
      <UsersPageContent />
    </div>
  );
};

export const UsersFullPage = FullPage(Users);

export default UsersFullPage;
