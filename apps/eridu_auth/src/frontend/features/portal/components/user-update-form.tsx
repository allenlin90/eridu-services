import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  Button,
  DialogFooter,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import { authClient } from '@/frontend/features/auth/api/auth-client';
import type { ExtendedUser } from '@/lib/types';

const userUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  emailVerified: z.boolean(),
  image: z.string().url('Invalid URL').optional().or(z.literal('')),
  role: z.string(),
});

type UserUpdateFormValues = z.infer<typeof userUpdateSchema>;

type UserUpdateFormProps = {
  user: ExtendedUser;
  onCancel: () => void;
  onSuccess: () => void;
};

export function UserUpdateForm({
  user,
  onCancel,
  onSuccess,
}: UserUpdateFormProps) {
  const form = useForm<UserUpdateFormValues>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      name: user.name || '',
      email: user.email || '',
      emailVerified: user.emailVerified || false,
      image: user.image || '',
      role: user.role || 'user',
    },
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || '',
        email: user.email || '',
        emailVerified: user.emailVerified || false,
        image: user.image || '',
        role: user.role || 'user',
      });
    }
  }, [user, form]);

  const onSubmit = useCallback(async (values: UserUpdateFormValues) => {
    try {
      const { error: updateError } = await authClient.admin.updateUser({
        userId: user.id,
        data: {
          name: values.name,
          email: values.email,
          emailVerified: values.emailVerified,
          image: values.image || null,
        },
      });

      if (updateError) {
        console.error('Update user error:', updateError);
        form.setError('root', { message: updateError.message || 'Failed to update user' });
        return;
      }

      if (values.role !== user.role) {
        const { error: roleError } = await authClient.admin.setRole({
          userId: user.id,
          role: values.role as 'admin' | 'user',
        });

        if (roleError) {
          console.error('Set role error:', roleError);
          form.setError('root', { message: roleError.message || 'Failed to update role' });
          return;
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Submission error:', error);
      form.setError('root', { message: 'An unexpected error occurred' });
    }
  }, [user, onSuccess, form]);

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {form.formState.errors.root && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {form.formState.errors.root.message}
          </div>
        )}

        <FormField
          control={form.control}
          name="name"
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emailVerified"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-8">
                <div className="space-y-0.5">
                  <FormLabel>Email Verified</FormLabel>
                </div>
                <FormControl>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

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
