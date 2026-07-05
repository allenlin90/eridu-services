import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  Button,
  CopyableText,
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

const createClientSchema = z.object({
  clientName: z.string().min(1, 'Name is required'),
  redirectUris: z.string().min(1, 'At least one redirect URI is required'),
  scope: z.string().min(1, 'At least one scope is required'),
});

type CreateClientFormValues = z.infer<typeof createClientSchema>;

type CreatedClient = {
  clientId: string;
  clientSecret: string;
};

export function AdminOAuthClientCreate() {
  const [created, setCreated] = useState<CreatedClient | null>(null);

  const form = useForm<CreateClientFormValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      clientName: '',
      redirectUris: '',
      scope: 'openid profile email offline_access',
    },
  });

  const onSubmit = async (values: CreateClientFormValues) => {
    const redirectUris = values.redirectUris
      .split('\n')
      .map((uri) => uri.trim())
      .filter(Boolean);

    try {
      const { data, error: createError } = await authClient.oauth2.createClient({
        client_name: values.clientName,
        redirect_uris: redirectUris,
        scope: values.scope,
      });

      if (createError) {
        form.setError('root', {
          message: createError.message || 'Failed to create OAuth client',
        });
        return;
      }

      if (data) {
        setCreated({ clientId: data.client_id, clientSecret: data.client_secret ?? '' });
      }
      form.reset({ clientName: '', redirectUris: '', scope: values.scope });
    } catch (err) {
      console.error(err);
      form.setError('root', { message: 'An unexpected error occurred' });
    }
  };

  const { isSubmitting } = form.formState;

  return (
    <div className="px-6 py-6">
      {created && (
        <div className="mb-6 space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Client created. Copy the secret now — it will not be shown again.
          </p>
          <div className="space-y-2">
            <div>
              <span className="block text-xs font-medium text-amber-800">Client ID</span>
              <CopyableText value={created.clientId} />
            </div>
            <div>
              <span className="block text-xs font-medium text-amber-800">Client Secret</span>
              <CopyableText value={created.clientSecret} />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setCreated(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {form.formState.errors.root && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {form.formState.errors.root.message}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4">
          <FormField
            control={form.control}
            name="clientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Open WebUI" {...field} />
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
                  <Textarea
                    placeholder="https://openwebui.example.com/oauth/oidc/callback"
                    rows={3}
                    {...field}
                  />
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
                  <Input placeholder="openid profile email offline_access" {...field} />
                </FormControl>
                <FormDescription>Space-separated.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Client...' : 'Create Client'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
