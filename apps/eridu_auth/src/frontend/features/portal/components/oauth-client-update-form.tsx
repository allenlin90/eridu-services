import type { OAuthClient } from '@better-auth/oauth-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  Button,
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

const updateClientSchema = z.object({
  clientName: z.string().min(1, 'Name is required'),
  redirectUris: z.string().min(1, 'At least one redirect URI is required'),
  scope: z.string().min(1, 'At least one scope is required'),
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
