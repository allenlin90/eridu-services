import type { z } from 'zod';

import type { ClientMechanicApiResponse } from '@eridu/api-types/client-mechanics';
import {
  createClientMechanicInputSchema,
  updateClientMechanicInputSchema,
} from '@eridu/api-types/client-mechanics';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@eridu/ui';

import { AdminFormDialog } from '@/features/admin/components';

type Mechanic = ClientMechanicApiResponse;
type CreateFormData = z.infer<typeof createClientMechanicInputSchema>;
type UpdateFormData = z.infer<typeof updateClientMechanicInputSchema>;

type MechanicCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateFormData) => Promise<void>;
  isLoading: boolean;
};

export function MechanicCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: MechanicCreateDialogProps) {
  return (
    <AdminFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Client Mechanic"
      description="Add a new reusable moderation instruction for this client"
      schema={createClientMechanicInputSchema}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'title',
          label: 'Title',
          placeholder: 'e.g. Speaking Instruction A',
        },
        {
          name: 'instruction_label',
          label: 'Instruction Label (Rendered Field Title)',
          placeholder: 'e.g. Product Promotion A',
        },
        {
          name: 'instruction_body',
          label: 'Instruction Body (Moderator Message)',
          type: 'textarea',
          placeholder: 'Describe the exact instructions for the moderator...',
        },
      ]}
    />
  );
}

type MechanicUpdateDialogProps = {
  mechanic: Mechanic | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateFormData) => Promise<void>;
  isLoading: boolean;
};

export function MechanicUpdateDialog({
  mechanic,
  onOpenChange,
  onSubmit,
  isLoading,
}: MechanicUpdateDialogProps) {
  // Ensure the version is included in default values so it validates update input schema.
  const defaultValues = mechanic
    ? {
        title: mechanic.title,
        instruction_label: mechanic.instruction_label,
        instruction_body: mechanic.instruction_body,
        version: mechanic.version,
      }
    : undefined;

  return (
    <AdminFormDialog
      open={!!mechanic}
      onOpenChange={onOpenChange}
      title="Edit Client Mechanic"
      description="Update the details of this client mechanic. Moderator-facing changes will bump the content revision."
      schema={updateClientMechanicInputSchema}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'title',
          label: 'Title',
          placeholder: 'e.g. Speaking Instruction A',
        },
        {
          name: 'instruction_label',
          label: 'Instruction Label (Rendered Field Title)',
          placeholder: 'e.g. Product Promotion A',
        },
        {
          name: 'instruction_body',
          label: 'Instruction Body (Moderator Message)',
          type: 'textarea',
          placeholder: 'Describe the exact instructions for the moderator...',
        },
      ]}
    />
  );
}

type MechanicRetireDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
  title?: string;
};

export function MechanicRetireDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  title,
}: MechanicRetireDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retire Client Mechanic</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to retire
            {' '}
            {title ? `"${title}"` : 'this mechanic'}
            ?
            It will be hidden from new template assignments, but existing references will be kept. You can reactivate it later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-warning text-white hover:bg-warning/90"
          >
            {isLoading ? 'Retiring...' : 'Retire'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type MechanicDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
  title?: string;
};

export function MechanicDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  title,
}: MechanicDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Client Mechanic</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete
            {' '}
            {title ? `"${title}"` : 'this mechanic'}
            ?
            This will remove the mechanic from the catalog. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
