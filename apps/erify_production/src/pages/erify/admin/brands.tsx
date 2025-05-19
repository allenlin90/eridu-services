import FullPage from "@/components/hoc/full-page";
import Modal from "@/components/modal";
import { PaginatedDataTable } from "@/components/paginated-data-table";
import { BrandSearchFilters } from "@/erify/admin/users/components/brand-search-filters";
import { useAdminBrandColumns } from "@/erify/admin/users/hooks/use-admin-brand-columns";
import { useQueryBrands } from "@/erify/admin/users/hooks/use-query-brands";
import { Button } from "@eridu/ui/components/button";
import { Plus } from "lucide-react";

const Brands: React.FC = () => {
  const { data, error, isPending, isError } = useQueryBrands();
  const columns = useAdminBrandColumns();

  return (
    <div className="h-full p-4 pb-0 flex flex-col">
      <div className="max-w-full flex flex-col sm:flex-row gap-4 mb-4 sm:mb-0">
        <BrandSearchFilters className="w-full order-2 sm:order-1" />
        <Modal
          title="Add new brand"
          description="Fill in the details to create a brand"
          trigger={(
            <Button
              type="button"
              variant="default"
              className="w-full sm:w-min order-1 sm:order-2"
            >
              <Plus />
              <span>Add Brand</span>
            </Button>
          )}
        />
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
