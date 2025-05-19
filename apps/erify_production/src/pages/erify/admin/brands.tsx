import FullPage from "@/components/hoc/full-page";
import { PaginatedDataTable } from "@/components/paginated-data-table";
import { useAdminBrandColumns } from "@/erify/admin/users/hooks/use-admin-brand-columns";
import { useQueryBrands } from "@/erify/admin/users/hooks/use-query-brands";

const Brands: React.FC = () => {
  const { data, error, isPending, isError } = useQueryBrands();
  const columns = useAdminBrandColumns();

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

export const BrandsPage = FullPage(Brands);

export default BrandsPage;
