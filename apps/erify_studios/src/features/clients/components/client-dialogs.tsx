import type { z } from 'zod';

import type { ClientApiResponse } from '@eridu/api-types/clients';
import {
  createClientInputSchema,
  updateClientInputSchema,
} from '@eridu/api-types/clients';

import {
  AdminFormDialog,
  DeleteConfirmDialog,
} from '@/features/admin/components';

type Client = ClientApiResponse;
type ClientFormData = z.infer<typeof createClientInputSchema>;
type UpdateClientFormData = z.infer<typeof updateClientInputSchema>;

type ClientCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ClientFormData) => Promise<void>;
  isLoading: boolean;
};

export function ClientCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: ClientCreateDialogProps) {
  return (
    <AdminFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Client"
      description="Add a new client to the system"
      schema={createClientInputSchema}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Enter client name',
        },
        {
          name: 'contact_person',
          label: 'Contact Person',
          placeholder: 'Enter contact person',
        },
        {
          name: 'contact_email',
          label: 'Contact Email',
          placeholder: 'Enter contact email',
        },
      ]}
    />
  );
}

type ClientUpdateDialogProps = {
  client: Client | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdateClientFormData) => Promise<void>;
  isLoading: boolean;
};

export function ClientUpdateDialog({
  client,
  onOpenChange,
  onSubmit,
  isLoading,
}: ClientUpdateDialogProps) {
  return (
    <AdminFormDialog
      open={!!client}
      onOpenChange={onOpenChange}
      title="Edit Client"
      description="Update client information"
      schema={updateClientInputSchema}
      defaultValues={
        client
          ? {
              name: client.name,
              contact_person: client.contact_person,
              contact_email: client.contact_email,
            }
          : undefined
      }
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Enter client name',
        },
        {
          name: 'id' as any,
          label: 'ID',
          render: () => (
            <div className="flex flex-col gap-2">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={client?.id || ''}
                readOnly
                onClick={(e) => {
                  e.currentTarget.select();
                  navigator.clipboard.writeText(client?.id || '');
                }}
                title="Click to copy ID"
              />
            </div>
          ),
        },
        {
          name: 'contact_person',
          label: 'Contact Person',
          placeholder: 'Enter contact person',
        },
        {
          name: 'contact_email',
          label: 'Contact Email',
          placeholder: 'Enter contact email',
        },
      ]}
    />
  );
}

type ClientDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function ClientDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: ClientDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Client"
      description="Are you sure you want to delete this client? This action cannot be undone."
      isLoading={isLoading}
    />
  );
}
