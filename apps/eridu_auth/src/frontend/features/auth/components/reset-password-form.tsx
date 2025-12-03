import { Link, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { Button, Input } from '@eridu/ui';

import { authClient } from '../api/auth-client';

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tokenParam = searchParams.get('token') ?? '';
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(errorParam);
    }

    if (!tokenParam) {
      router.navigate({
        to: '/forgot-password',
        search: { error: 'Invalid or missing reset token' },
      });
    }

    setToken(tokenParam);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (resetError) {
        setError(resetError.message || 'Failed to reset password');
      } else {
        setSuccess(true);
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
      <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="rounded-md bg-green-50 p-4 text-green-700">
            <h3 className="text-lg font-medium">Password Reset Successful</h3>
            <p className="mt-2 text-sm">
              Your password has been successfully reset. You can now sign in with
              your new password.
            </p>
          </div>
          <div className="mt-4">
            <Link
              to="/sign-in"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Set new password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter your new password below.
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                New Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm Password
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
            <div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
            <div className="text-center text-sm">
              <Link
                to="/sign-in"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
