import type { OAuthClient } from '@better-auth/oauth-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  Button,
  Checkbox,
  DialogFooter,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from '@eridu/ui';

import { authClient } from '@/frontend/features/auth/api/auth-client';
import env from '@/frontend/utils/env';

const updateClientSchema = z.object({
  clientName: z.string().min(1, 'Name is required'),
  redirectUris: z.string().min(1, 'At least one redirect URI is required'),
  scope: z.string().min(1, 'At least one scope is required'),
  requirePkce: z.boolean(),
});

type UpdateClientFormValues = z.infer<typeof updateClientSchema>;

type OAuthClientUpdateFormProps = {
  client: OAuthClient;
  onCancel: () => void;
  onSuccess: () => void;
};

export function OAuthClientUpdateForm({ client, onCancel, onSuccess }: OAuthClientUpdateFormProps) {
  const form = useForm<UpdateClientFormValues>({
    resolver: zodResolver(updateClientSchema),
    defaultValues: {
      clientName: client.client_name || '',
      redirectUris: client.redirect_uris.join('\n'),
      scope: client.scope || '',
      requirePkce: client.require_pkce ?? true,
    },
  });

  const onSubmit = async (values: UpdateClientFormValues) => {
    const redirectUris = values.redirectUris
      .split('\n')
      .map((uri) => uri.trim())
      .filter(Boolean);

    try {
      const { error: updateError } = await authClient.oauth2.updateClient({
        client_id: client.client_id,
        update: {
          client_name: values.clientName,
          redirect_uris: redirectUris,
          scope: values.scope,
        },
      });

      if (updateError) {
        form.setError('root', { message: updateError.message || 'Failed to update client' });
        return;
      }

      // require_pkce isn't supported by better-auth's oauth2.updateClient (see
      // eridu-auth-oauth-provider skill); it's updated through this app's own admin route.
      if (values.requirePkce !== (client.require_pkce ?? true)) {
        const pkceRes = await fetch(
          `${env.VITE_BETTER_AUTH_URL || window.location.origin}/api/admin/oauth-clients/${client.client_id}/require-pkce`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ requirePkce: values.requirePkce }),
          },
        );

        if (!pkceRes.ok) {
          form.setError('root', { message: 'Failed to update PKCE requirement' });
          return;
        }
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      form.setError('root', { message: 'An unexpected error occurred' });
    }
  };

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {form.formState.errors.root && (
          <div className="rounded-md bg-red-100 p-3 text-sm text-red-700">
            {form.formState.errors.root.message}
          </div>
        )}

        <FormField
          control={form.control}
          name="clientName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="redirectUris"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Redirect URIs</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormDescription>One URI per line.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="scope"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scopes</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Space-separated.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="requirePkce"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Require PKCE</FormLabel>
                <FormDescription>
                  Disable only if the client's OAuth library does not support PKCE (e.g. some generic OIDC
                  integrations, such as Open WebUI). Enabled by default per OAuth 2.1 best practice.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
