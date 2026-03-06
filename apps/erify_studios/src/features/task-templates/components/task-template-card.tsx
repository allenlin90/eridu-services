import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Copy, FileText, MoreVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { TaskTemplateDto, UiSchema } from '@eridu/api-types/task-management';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@eridu/ui';

import { useCreateTaskTemplate } from '../hooks/use-create-task-template';
import { useDeleteTaskTemplate } from '../hooks/use-delete-task-template';

import { getTaskTypeLabel } from '@/lib/constants/task-type-labels';

type TaskTemplateCardProps = {
  template: TaskTemplateDto;
  studioId: string;
};

function resolveTemplateSchemaForClone(template: TaskTemplateDto): UiSchema {
  const rawSchema = template.current_schema as Partial<UiSchema> | undefined;
  const rawItems = rawSchema?.items;

  const items = Array.isArray(rawItems)
    ? rawItems.map((item) => ({
        ...item,
        // Generate new IDs for cloned fields to avoid collisions.
        id: crypto.randomUUID(),
      }))
    : [];

  return {
    items,
    ...(rawSchema?.metadata ? { metadata: rawSchema.metadata } : {}),
  };
}

export function TaskTemplateCard({ template, studioId }: TaskTemplateCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const updatedAtLabel = format(new Date(template.updated_at), 'MMM d, yyyy');

  const { mutate: cloneTemplate, isPending: isCloning } = useCreateTaskTemplate({
    studioId,
    onSuccess: () => {
      toast.success('Template cloned', {
        description: `"${template.name}" has been cloned successfully.`,
      });
    },
  });

  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTaskTemplate({
    studioId,
    onSuccess: () => {
      toast.success('Template deleted', {
        description: `"${template.name}" has been deleted successfully.`,
      });
      setShowDeleteDialog(false);
    },
  });

  const onClone = () => {
    cloneTemplate({
      name: `${template.name} (Copy)`,
      description: template.description ?? '',
      task_type: template.task_type,
      schema: resolveTemplateSchemaForClone(template),
    });
  };

  const onDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    deleteTemplate(template.id);
  };

  return (
    <>
      <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="line-clamp-1">{template.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <span>
                    {`v${template.version} • Updated ${updatedAtLabel}`}
                  </span>
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="shrink-0"
            >
              {getTaskTypeLabel(template.task_type)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {template.description || 'No description provided.'}
          </p>
        </CardContent>
        <CardFooter className="pt-4 border-t flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
          >
            <Link
              to="/studios/$studioId/task-templates/$templateId"
              params={{ studioId, templateId: template.id }}
            >
              View Details
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onClone} disabled={isCloning}>
                <Copy className="mr-2 h-4 w-4" />
                Clone
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "
              {template.name}
              "? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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
