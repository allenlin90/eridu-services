import type { OAuthClient } from '@better-auth/oauth-provider';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@eridu/ui';

import { OAuthClientUpdateForm } from './oauth-client-update-form';

type OAuthClientUpdateDialogProps = {
  client: OAuthClient | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function OAuthClientUpdateDialog({
  client,
  onOpenChange,
  onSuccess,
}: OAuthClientUpdateDialogProps) {
  return (
    <Dialog open={!!client} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit OAuth Client</DialogTitle>
          <DialogDescription>
            Update the client's name, redirect URIs, and scopes.
          </DialogDescription>
        </DialogHeader>
        {client && (
          <OAuthClientUpdateForm
            client={client}
            onCancel={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
