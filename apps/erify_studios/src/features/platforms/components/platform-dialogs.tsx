import type { z } from 'zod';

import type { PlatformApiResponse } from '@eridu/api-types/platforms';

import {
  AdminFormDialog,
  DeleteConfirmDialog,
} from '@/features/admin/components';
import { platformSchema } from '@/features/platforms/config/platform-search-schema';

type Platform = PlatformApiResponse;
type PlatformFormData = z.infer<typeof platformSchema>;

type PlatformCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PlatformFormData) => Promise<void>;
  isLoading: boolean;
};

export function PlatformCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: PlatformCreateDialogProps) {
  return (
    <AdminFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Platform"
      description="Add a new platform to the system"
      schema={platformSchema}
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Enter platform name',
        },
        {
          name: 'api_config',
          label: 'API Config (JSON)',
          placeholder: '{"apiKey": "...", "apiSecret": "..."}',
          type: 'textarea',
        },
      ]}
    />
  );
}

type PlatformUpdateDialogProps = {
  platform: Platform | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PlatformFormData) => Promise<void>;
  isLoading: boolean;
};

export function PlatformUpdateDialog({
  platform,
  onOpenChange,
  onSubmit,
  isLoading,
}: PlatformUpdateDialogProps) {
  return (
    <AdminFormDialog
      open={!!platform}
      onOpenChange={onOpenChange}
      title="Edit Platform"
      description="Update platform information"
      schema={platformSchema}
      defaultValues={
        platform
          ? {
              name: platform.name,
              api_config: JSON.stringify(platform.api_config, null, 2),
            }
          : undefined
      }
      onSubmit={onSubmit}
      isLoading={isLoading}
      fields={[
        {
          name: 'name',
          label: 'Name',
          placeholder: 'Enter platform name',
        },
        {
          name: 'api_config',
          label: 'API Config (JSON)',
          placeholder: '{"apiKey": "...", "apiSecret": "..."}',
          type: 'textarea',
        },
      ]}
    />
  );
}

type PlatformDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function PlatformDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: PlatformDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Platform"
      description="Are you sure you want to delete this platform? This action cannot be undone."
      isLoading={isLoading}
    />
  );
}
