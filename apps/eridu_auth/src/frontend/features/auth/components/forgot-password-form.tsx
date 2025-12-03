import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { Button, Input } from '@eridu/ui';

import { authClient } from '../api/auth-client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check for error in URL query params (e.g. from invalid reset token)
  if (!error) {
    const searchParams = new URLSearchParams(window.location.search);
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(errorParam);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: forgotError } = await authClient.requestPasswordReset({
        email,
        redirectTo: '/reset-password', // This should be a valid route to handle reset
      });

      if (forgotError) {
        setError(forgotError.message || 'Failed to send reset link');
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

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
                Check your email for a link to reset your password.
              </div>
            )}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  if (error) {
                    setError('');
                  }
                  setEmail(e.target.value);
                }}
              />
            </div>
            <div>
              <Button type="submit" className="w-full" disabled={loading || success}>
                {loading ? 'Sending...' : 'Send reset link'}
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
