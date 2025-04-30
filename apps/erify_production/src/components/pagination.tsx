import {
  Pagination as Page,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@eridu/ui/components/pagination";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

type PaginationProps = {
  pageSize: number; // Number of items per page (UI)
  page: number; // Current page (UI)
  total: number; // Total number of items
};

export const Pagination: React.FC<PaginationProps> = ({ pageSize, page, total }) => {
  const [_, setSearchParams] = useSearchParams();

  // Calculate the total number of pages
  const totalPages = useMemo(() => Math.ceil(total / pageSize), [total, pageSize]);

  const onPreviousPage = useCallback(() => {
    if (page > 1) {
      setSearchParams((params) => {
        const newPage = page - 1;
        params.set("page", String(newPage));
        params.set("size", String(pageSize));
        return params;
      });
    }
  }, [page, pageSize, setSearchParams]);

  const onChangePage = useCallback(
    (newPage: number) => (_e: React.MouseEvent<HTMLButtonElement>) => {
      setSearchParams((params) => {
        params.set("page", String(newPage));
        params.set("size", String(pageSize));
        return params;
      });
    },
    [pageSize, setSearchParams],
  );

  const onNextPage = useCallback(() => {
    if (page < totalPages) {
      setSearchParams((params) => {
        const newPage = page + 1;
        params.set("page", String(newPage));
        params.set("size", String(pageSize));
        return params;
      });
    }
  }, [page, totalPages, pageSize, setSearchParams]);

  // Determine the range of pages to display
  const visiblePages = useMemo(() => {
    const pages: number[] = [];

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1); // Always include the first page

    if (page > 3) {
      pages.push(-1); // Ellipsis before the current range
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (page < totalPages - 2) {
      pages.push(-1); // Ellipsis after the current range
    }

    pages.push(totalPages); // Always include the last page

    return pages;
  }, [page, totalPages]);

  return (
    <Page>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious onClick={onPreviousPage} disabled={page === 1} />
        </PaginationItem>
        {visiblePages.map((currentPage, index) =>
          currentPage === -1
            ? (
                // eslint-disable-next-line react/no-array-index-key
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              )
            : (
                <PaginationItem key={currentPage}>
                  <PaginationLink
                    onClick={onChangePage(currentPage)}
                    isActive={currentPage === page}
                  >
                    {currentPage}
                  </PaginationLink>
                </PaginationItem>
              ),
        )}
        <PaginationItem>
          <PaginationNext onClick={onNextPage} disabled={page === totalPages} />
        </PaginationItem>
      </PaginationContent>
    </Page>
  );
};
