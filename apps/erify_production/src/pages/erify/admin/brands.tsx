import FullPage from "@/components/hoc/full-page";
import { PaginatedDataTable } from "@/components/paginated-data-table";
import { AddBrandModal } from "@/erify/admin/brands/components/add-brand-modal";
import { BrandSearchFilters } from "@/erify/admin/brands/components/brand-search-filters";
import { useAdminBrandColumns } from "@/erify/admin/brands/hooks/use-admin-brand-columns";
import { useQueryBrands } from "@/erify/admin/brands/hooks/use-query-brands";

const Brands: React.FC = () => {
  const { data, error, isPending, isError } = useQueryBrands();
  const columns = useAdminBrandColumns();

  return (
    <div className="h-full p-4 pb-0 flex flex-col">
      <div className="max-w-full flex flex-col sm:flex-row gap-4 mb-4 sm:mb-0">
        <BrandSearchFilters className="w-full order-2 sm:order-1" />
        <AddBrandModal />
      </div>
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
