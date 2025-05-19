import type { PaginatedData } from "@/api/types";
import type { ColumnDef } from "@tanstack/react-table";
import type { AxiosError } from "axios";

import { Pagination } from "@/components/pagination";
import { DataTable } from "@eridu/ui/components/data-table";
import { LoaderCircle } from "lucide-react";

const LIMIT = 10;

type PaginatedDataForTable<Row> = Omit<PaginatedData<Row>, "data"> & { data: Row[] };

type PaginatedDataTableProps<Row, ErrorType = AxiosError> = {
  columns: ColumnDef<Row>[];
  data?: PaginatedDataForTable<Row>;
  error: ErrorType | null;
  isLoading: boolean;
  isError: boolean;
  limit?: number;
};

export function PaginatedDataTable<
  Row,
  ErrorType extends AxiosError<{ message?: string }> = AxiosError<{ message?: string }>,
>({
  columns,
  data,
  error,
  isLoading,
  isError,
  limit = LIMIT,
}: PaginatedDataTableProps<Row, ErrorType>) {
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
    const errorMessage = (error?.response?.data.message) || "something went wrong";
    return <p className="text-center">{errorMessage}</p>;
  }

  if (!data) {
    return <p className="text-center">No data</p>;
  }

  const page = data ? Math.ceil(data.offset / data.limit) + 1 : 1;

  return (
    <>
      <div className="max-w-full overflow-auto h-full max-h-sm-user-content-area sm:max-h-user-content-area">
        <DataTable columns={columns} data={data.data} />
      </div>
      <div className="p-4">
        <Pagination pageSize={limit} page={page} total={data?.total ?? 1} />
      </div>
    </>
  );
};
