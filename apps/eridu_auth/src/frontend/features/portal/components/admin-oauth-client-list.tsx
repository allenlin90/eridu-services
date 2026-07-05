import type { OAuthClient } from '@better-auth/oauth-provider';
import { KeyRound, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  Badge,
  Button,
  CopyableText,
  DataTableActions,
  DropdownMenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@eridu/ui';

import { OAuthClientDeleteDialog } from './oauth-client-delete-dialog';
import { OAuthClientRotateSecretDialog } from './oauth-client-rotate-secret-dialog';
import { OAuthClientUpdateDialog } from './oauth-client-update-dialog';

import { authClient } from '@/frontend/features/auth/api/auth-client';
import { useOAuthClients } from '@/frontend/features/portal/hooks/use-oauth-clients';

export function AdminOAuthClientList() {
  const { clients, loading, error: listError, refresh } = useOAuthClients();

  const [editingClient, setEditingClient] = useState<OAuthClient | null>(null);
  const [rotatingClient, setRotatingClient] = useState<OAuthClient | null>(null);
  const [deletingClient, setDeletingClient] = useState<OAuthClient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  const handleDelete = async () => {
    if (!deletingClient)
      return;

    setDeleting(true);
    try {
      const { error: deleteError } = await authClient.oauth2.deleteClient({
        client_id: deletingClient.client_id,
      });

      if (deleteError) {
        setActionSuccess(null);
        console.error(deleteError);
        return;
      }

      setDeletingClient(null);
      setActionSuccess('Client deleted');
      refresh();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-500">
          Total Clients:
          {' '}
          <span className="font-semibold text-gray-900">{clients.length}</span>
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refresh()}
          disabled={loading}
          title="Refresh list"
          className="h-9 w-9"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {listError && (
        <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600">
          {listError}
        </div>
      )}

      {actionSuccess && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            {actionSuccess}
          </div>
        </div>
      )}

      <div className="rounded-md border border-gray-100 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[15%]">Client ID</TableHead>
              <TableHead className="w-[25%]">Name</TableHead>
              <TableHead>Redirect URIs</TableHead>
              <TableHead>Scopes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && clients.length === 0
              ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                        <span className="text-sm">Loading clients...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              : clients.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-gray-400">
                        No OAuth clients yet.
                      </TableCell>
                    </TableRow>
                  )
                : (
                    clients.map((client) => (
                      <TableRow key={client.client_id} className="hover:bg-gray-50/50">
                        <TableCell>
                          <CopyableText value={client.client_id} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {client.client_name || 'Unnamed'}
                            </span>
                            {client.disabled && (
                              <Badge variant="destructive" className="mt-1 w-fit">Disabled</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {client.redirect_uris.map((uri) => (
                              <span key={uri} className="max-w-xs truncate text-xs text-gray-600">
                                {uri}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(client.scope || '').split(' ').filter(Boolean).map((scope) => (
                              <Badge key={scope} variant="secondary">{scope}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DataTableActions
                            row={client}
                            onEdit={setEditingClient}
                            onDelete={setDeletingClient}
                            renderExtraActions={(row) => (
                              <DropdownMenuItem onClick={() => setRotatingClient(row)}>
                                <KeyRound className="mr-2 h-4 w-4" />
                                Rotate Secret
                              </DropdownMenuItem>
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
          </TableBody>
        </Table>
      </div>

      <OAuthClientUpdateDialog
        client={editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        onSuccess={() => {
          setEditingClient(null);
          setActionSuccess('Client updated successfully');
          refresh();
        }}
      />

      <OAuthClientRotateSecretDialog
        client={rotatingClient}
        onOpenChange={(open) => !open && setRotatingClient(null)}
        onRotated={() => refresh()}
      />

      <OAuthClientDeleteDialog
        open={!!deletingClient}
        clientName={deletingClient?.client_name}
        onOpenChange={(open) => !open && setDeletingClient(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </div>
  );
}
