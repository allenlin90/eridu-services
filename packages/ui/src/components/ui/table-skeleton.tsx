import { cn } from '@eridu/ui/lib/utils';

import { Skeleton } from './skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

type TableSkeletonProps = {
  columnCount: number;
  rowCount?: number;
  showButton?: boolean;
  cellClassName?: string;
  rowClassName?: string;
};

export function TableSkeleton({
  columnCount,
  rowCount = 5,
  showButton = false,
  cellClassName,
  rowClassName,
}: TableSkeletonProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className={rowClassName}>
          {Array.from({ length: columnCount }).map((_, i) => (
            <TableHead key={i} className={cellClassName}>
              <Skeleton className="h-4 w-[60%]" />
            </TableHead>
          ))}
          {showButton && <TableHead className="w-[100px]" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <TableRow key={rowIndex} className={cn('h-12', rowClassName)}>
            {Array.from({ length: columnCount }).map((_, colIndex) => (
              <TableCell key={colIndex} className={cellClassName}>
                <Skeleton
                  className={cn(
                    'h-4',
                    colIndex === 0 ? 'w-[40%]' : 'w-[80%]',
                  )}
                />
              </TableCell>
            ))}
            {showButton && (
              <TableCell>
                <Skeleton className="h-8 w-8 rounded-md" />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
