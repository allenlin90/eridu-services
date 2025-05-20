import { FullPage } from "@/components/hoc/full-page";
import { PaginatedDataTable } from "@/components/paginated-data-table";
import { AddStudioRoomModal } from "@/erify/admin/studio-rooms/components/add-studio-room-modal";
import { StudioRoomSearchFilters } from "@/erify/admin/studio-rooms/components/studio-room-search-filters";
import { useAdminStudioRoomColumns } from "@/erify/admin/studio-rooms/hooks/use-admin-studio-room-columns";
import { useQueryStudioRooms } from "@/erify/admin/studio-rooms/hooks/use-query-studio-rooms";

const StudioRooms: React.FC = () => {
  const { data, error, isPending, isError } = useQueryStudioRooms();
  const columns = useAdminStudioRoomColumns();

  return (
    <div className="h-full p-4 pb-0 flex flex-col">
      <div className="max-w-full flex flex-col sm:flex-row gap-4 mb-4 sm:mb-0">
        <StudioRoomSearchFilters className="w-full order-2 sm:order-1" />
        <AddStudioRoomModal />
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

export const StudioRoomsPage = FullPage(StudioRooms);

export default StudioRoomsPage;
