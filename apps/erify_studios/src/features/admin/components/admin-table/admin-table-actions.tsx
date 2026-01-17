import {
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@eridu/ui';

type AdminTableActionsProps<TData> = {
  row: TData;
  onEdit?: (row: TData) => void;
  onDelete?: (row: TData) => void;
  renderExtraActions?: (row: TData) => React.ReactNode;
};

export function AdminTableActions<TData>({
  row,
  onEdit,
  onDelete,
  renderExtraActions,
}: AdminTableActionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        {renderExtraActions && renderExtraActions(row)}
        {renderExtraActions && (onEdit || onDelete) && <DropdownMenuSeparator />}
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(row)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem
            onClick={() => onDelete(row)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
