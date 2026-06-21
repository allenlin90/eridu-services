import { Archive, Eye, RotateCcw } from 'lucide-react';

import type { ClientMechanicApiResponse } from '@eridu/api-types/client-mechanics';
import { DataTableActions, DropdownMenuItem } from '@eridu/ui';

type Mechanic = ClientMechanicApiResponse;

type MechanicActionsCellProps = {
  mechanic: Mechanic;
  onEdit: (mechanic: Mechanic) => void;
  onRetire: (mechanic: Mechanic) => void;
  onReactivate: (mechanic: Mechanic) => void;
  onDelete: (mechanic: Mechanic) => void;
  onViewCoverage?: (mechanic: Mechanic) => void;
  isActionPending?: boolean;
  /**
   * Hard-delete is ADMIN-only on the backend; hide the action for everyone else
   * rather than showing a menu item that always 403s.
   */
  canDelete?: boolean;
};

export function MechanicActionsCell({
  mechanic,
  onEdit,
  onRetire,
  onReactivate,
  onDelete,
  onViewCoverage,
  isActionPending = false,
  canDelete = false,
}: MechanicActionsCellProps) {
  const isActive = mechanic.status === 'active';

  return (
    <DataTableActions
      row={mechanic}
      onEdit={() => onEdit(mechanic)}
      onDelete={canDelete ? () => onDelete(mechanic) : undefined}
      renderExtraActions={() => (
        <>
          {onViewCoverage && (
            <DropdownMenuItem onClick={() => onViewCoverage(mechanic)} disabled={isActionPending}>
              <Eye className="mr-2 h-4 w-4" />
              View Coverage
            </DropdownMenuItem>
          )}
          {isActive
            ? (
                <DropdownMenuItem onClick={() => onRetire(mechanic)} disabled={isActionPending}>
                  <Archive className="mr-2 h-4 w-4" />
                  Retire
                </DropdownMenuItem>
              )
            : (
                <DropdownMenuItem onClick={() => onReactivate(mechanic)} disabled={isActionPending}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reactivate
                </DropdownMenuItem>
              )}
        </>
      )}
    />
  );
}
