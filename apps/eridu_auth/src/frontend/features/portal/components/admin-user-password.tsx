import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@eridu/ui';

import { authClient } from '@/frontend/features/auth/api/auth-client';

const setPasswordSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

export function AdminUserPassword() {
  const [success, setSuccess] = useState<string | null>(null);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const form = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      userId: '',
      newPassword: '',
    },
  });

  const onSubmit = async (values: SetPasswordFormValues) => {
    setSuccess(null);
    try {
      const { error: passwordError } = await authClient.admin.setUserPassword({
        userId: values.userId,
        newPassword: values.newPassword,
      });

      if (passwordError) {
        form.setError('root', {
          message: passwordError.message || 'Failed to set password',
        });
      } else {
        setSuccess('Password updated successfully');
        form.reset({
          userId: '',
          newPassword: '',
        });
      }
    } catch (err) {
      console.error(err);
      form.setError('root', { message: 'An unexpected error occurred' });
    }
  };

  const { isSubmitting } = form.formState;

  return (
    <div className="px-6 py-6">
      {success && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            {success}
          </div>
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
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User ID</FormLabel>
                <FormControl>
                  <Input placeholder="Enter user ID" {...field} />
                </FormControl>
                <FormDescription>
                  You can find the user ID in the user list
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter new password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Setting Password...' : 'Set Password'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
