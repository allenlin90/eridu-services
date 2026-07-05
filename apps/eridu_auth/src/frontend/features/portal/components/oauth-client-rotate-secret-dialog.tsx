import type { OAuthClient } from '@better-auth/oauth-provider';
import { useState } from 'react';

import {
  Button,
  CopyableText,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@eridu/ui';

import { authClient } from '@/frontend/features/auth/api/auth-client';

type OAuthClientRotateSecretDialogProps = {
  client: OAuthClient | null;
  onOpenChange: (open: boolean) => void;
  onRotated: () => void;
};

export function OAuthClientRotateSecretDialog({
  client,
  onOpenChange,
  onRotated,
}: OAuthClientRotateSecretDialogProps) {
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = (open: boolean) => {
    if (!open) {
      setNewSecret(null);
      setError(null);
    }
    onOpenChange(open);
  };

  const handleRotate = async () => {
    if (!client)
      return;

    setRotating(true);
    setError(null);

    try {
      const { data, error: rotateError } = await authClient.oauth2.client.rotateSecret({
        client_id: client.client_id,
      });

      if (rotateError) {
        setError(rotateError.message || 'Failed to rotate secret');
        return;
      }

      if (data) {
        setNewSecret(data.client_secret ?? '');
        onRotated();
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred');
    } finally {
      setRotating(false);
    }
  };

  return (
    <Dialog open={!!client} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Rotate Client Secret</DialogTitle>
          <DialogDescription>
            {newSecret
              ? 'Copy the new secret now — it will not be shown again.'
              : `The current secret for "${client?.client_name || client?.client_id}" will stop working immediately.`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {newSecret
          ? (
              <div className="space-y-2">
                <span className="block text-xs font-medium text-gray-500">New Client Secret</span>
                <CopyableText value={newSecret} />
              </div>
            )
          : null}

        <DialogFooter>
          {newSecret
            ? (
                <Button type="button" onClick={() => handleClose(false)}>
                  Done
                </Button>
              )
            : (
                <>
                  <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleRotate} disabled={rotating}>
                    {rotating ? 'Rotating...' : 'Rotate Secret'}
                  </Button>
                </>
              )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
