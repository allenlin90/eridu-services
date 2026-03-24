import { useNavigate } from '@tanstack/react-router';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, DataTableActions, DropdownMenuItem } from '@eridu/ui';

import { useCreateTaskTemplate } from '@/features/task-templates/hooks/use-create-task-template';
import { useDeleteTaskTemplate } from '@/features/task-templates/hooks/use-delete-task-template';
import { resolveTemplateSchemaForClone } from '@/features/task-templates/lib/resolve-template-schema-for-clone';
import type { StudioTaskTemplateListRow } from '@/features/task-templates/lib/studio-task-template-list-row';

type StudioTaskTemplateTableActionsCellProps = {
  row: StudioTaskTemplateListRow;
  studioId: string;
};

export function StudioTaskTemplateTableActionsCell({
  row,
  studioId,
}: StudioTaskTemplateTableActionsCellProps) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { mutate: cloneTemplate, isPending: isCloning } = useCreateTaskTemplate({
    studioId,
    onSuccess: () => {
      toast.success('Template cloned', {
        description: `"${row.name}" has been cloned successfully.`,
      });
    },
  });

  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTaskTemplate({
    studioId,
    onSuccess: () => {
      toast.success('Template deleted', {
        description: `"${row.name}" has been deleted successfully.`,
      });
      setShowDeleteDialog(false);
    },
  });

  return (
    <>
      <DataTableActions
        row={row}
        onEdit={() => {
          navigate({
            to: '/studios/$studioId/task-templates/$templateId',
            params: {
              studioId,
              templateId: row.id,
            },
          });
        }}
        onDelete={() => setShowDeleteDialog(true)}
        renderExtraActions={() => (
          <DropdownMenuItem
            onClick={() => {
              cloneTemplate({
                name: `${row.name} (Copy)`,
                description: row.description ?? '',
                task_type: row.task_type,
                schema: resolveTemplateSchemaForClone(row.template),
              });
            }}
            disabled={isCloning}
          >
            <Copy className="mr-2 h-4 w-4" />
            Clone
          </DropdownMenuItem>
        )}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "
              {row.name}
              "? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplate(row.id)}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
