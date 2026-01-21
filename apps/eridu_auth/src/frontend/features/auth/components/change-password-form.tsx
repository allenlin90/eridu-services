import { Link, useRouter } from '@tanstack/react-router';
import { useState } from 'react';

import { Button, Input } from '@eridu/ui';

import { authClient } from '@/frontend/features/auth/api/auth-client';

type ChangePasswordFormProps = {
  onSuccess?: () => void;
  className?: string;
  isDialog?: boolean;
};

export function ChangePasswordForm({ onSuccess, className, isDialog = false }: ChangePasswordFormProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      const { error: changeError } = await authClient.changePassword({
        newPassword,
        currentPassword,
        revokeOtherSessions,
      });

      if (changeError) {
        setError(changeError.message || 'Failed to change password');
      } else {
        setSuccess(true);
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
            // Reset form
            setSuccess(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          }, 2000);
        } else {
          // Redirect to portal after 2 seconds
          setTimeout(() => {
            router.navigate({ to: '/' });
          }, 2000);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={isDialog ? 'py-4 text-center' : 'flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8'}>
        <div className={isDialog ? 'w-full space-y-4' : 'w-full max-w-md space-y-8 text-center'}>
          <div className="rounded-md bg-green-50 p-4 text-green-700">
            <h3 className="text-lg font-medium">Password Changed Successfully</h3>
            <p className="mt-2 text-sm">
              Your password has been successfully changed.
              {revokeOtherSessions && ' All other sessions have been revoked.'}
            </p>
            {!onSuccess && <p className="mt-2 text-sm">Redirecting to portal...</p>}
          </div>
        </div>
      </div>
    );
  }

  const content = (
    <div className={isDialog ? 'space-y-4' : 'w-full max-w-md space-y-8'}>
      {!isDialog && (
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Change your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your current password and choose a new one.
          </p>
        </div>
      )}
      <div className={isDialog ? 'mt-4 space-y-4' : 'mt-8 space-y-6'}>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Current Password
            </label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700"
            >
              New Password
            </label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              className="mt-1"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Must be at least 8 characters
            </p>
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className="mt-1"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="flex items-center">
            <input
              id="revokeOtherSessions"
              name="revokeOtherSessions"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={revokeOtherSessions}
              onChange={(e) => setRevokeOtherSessions(e.target.checked)}
            />
            <label
              htmlFor="revokeOtherSessions"
              className="ml-2 block text-sm text-gray-700"
            >
              Sign out all other devices
            </label>
          </div>
          <div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Changing Password...' : 'Change Password'}
            </Button>
          </div>
          {!isDialog && (
            <div className="text-center text-sm">
              <Link
                to="/"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Back to portal
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );

  if (isDialog)
    return content;

  return (
    <div className={`flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 ${className || ''}`}>
      {content}
    </div>
  );
}
