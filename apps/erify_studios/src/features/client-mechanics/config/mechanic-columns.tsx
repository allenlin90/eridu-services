import type { ColumnDef } from '@tanstack/react-table';
import { Archive, Pencil, RotateCcw, Trash2 } from 'lucide-react';

import type { ClientMechanicApiResponse } from '@eridu/api-types/client-mechanics';
import { Badge, Button, CopyableText, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@eridu/ui';

type Mechanic = ClientMechanicApiResponse;

type GetMechanicColumnsProps = {
  onEdit: (mechanic: Mechanic) => void;
  onRetire: (mechanic: Mechanic) => void;
  onReactivate: (mechanic: Mechanic) => void;
  onDelete: (mechanic: Mechanic) => void;
  isActionPending?: boolean;
};

export function getMechanicColumns({
  onEdit,
  onRetire,
  onReactivate,
  onDelete,
  isActionPending = false,
}: GetMechanicColumnsProps): ColumnDef<Mechanic>[] {
  return [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <CopyableText value={row.original.id} />,
      size: 150,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{row.original.title}</span>
      ),
    },
    {
      accessorKey: 'instruction_label',
      header: 'Instruction Label',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.instruction_label}</span>
      ),
    },
    {
      accessorKey: 'instruction_body',
      header: 'Instruction Body',
      cell: ({ row }) => {
        const body = row.original.instruction_body;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="max-w-[300px] truncate text-sm cursor-help">
                  {body}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-2 text-xs bg-popover border text-popover-foreground shadow-md rounded-md">
                {body}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return status === 'active'
          ? (
              <Badge variant="success" className="capitalize">Active</Badge>
            )
          : (
              <Badge variant="secondary" className="capitalize bg-muted text-muted-foreground border-muted">Retired</Badge>
            );
      },
      size: 100,
    },
    {
      accessorKey: 'content_revision',
      header: 'Rev',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs">
          v
          {row.original.content_revision}
        </Badge>
      ),
      size: 80,
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated At',
      cell: ({ row }) => new Date(row.original.updated_at).toLocaleString(),
      size: 180,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const mechanic = row.original;
        const isActive = mechanic.status === 'active';

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(mechanic)}
              disabled={isActionPending}
              title="Edit Mechanic"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {isActive
              ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRetire(mechanic)}
                    disabled={isActionPending}
                    title="Retire Mechanic"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                )
              : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-success"
                    onClick={() => onReactivate(mechanic)}
                    disabled={isActionPending}
                    title="Reactivate Mechanic"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(mechanic)}
              disabled={isActionPending}
              title="Delete Mechanic"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
      size: 120,
      enableHiding: false,
    },
  ];
}

export const mechanicSearchableColumns = [
  { id: 'title', title: 'Title', type: 'text' as const },
  {
    id: 'status',
    title: 'Status',
    type: 'select' as const,
    options: [
      { value: 'active', label: 'Active' },
      { value: 'retired', label: 'Retired' },
    ],
  },
];
