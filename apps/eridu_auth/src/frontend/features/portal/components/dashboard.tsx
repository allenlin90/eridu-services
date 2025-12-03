import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';

import { Button } from '@eridu/ui';

import { authClient } from '../../auth/api/auth-client';

export function Dashboard() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authClient.signOut();
      router.navigate({ to: '/sign-in' });
    } catch (error) {
      console.error('Logout failed:', error);
      setLoggingOut(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null; // Will be handled by route redirect
  }

  const { user } = session;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Welcome to Eridu Auth
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Your central authentication portal
          </p>
        </div>

        {/* User Session Card */}
        <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Account
            </h2>
          </div>
          <div className="px-6 py-6">
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">
                  {user.name || 'Not provided'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">
                  {user.email}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Email Verification
                </dt>
                <dd className="mt-1">
                  {user.emailVerified
                    ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                          <svg
                            className="mr-1.5 h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Verified
                        </span>
                      )
                    : (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                          <svg
                            className="mr-1.5 h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Not Verified
                        </span>
                      )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">User ID</dt>
                <dd className="mt-1 font-mono text-sm text-gray-700">
                  {user.id}
                </dd>
              </div>
              {session.session.createdAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Session Started
                  </dt>
                  <dd className="mt-1 text-sm text-gray-700">
                    {new Date(session.session.createdAt).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Integrated Apps Section */}
        <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Integrated Applications
            </h2>
          </div>
          <div className="px-6 py-8">
            <div className="text-center text-gray-500">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="mt-4 text-sm">
                No integrated applications yet. This section will display apps
                that use Eridu Auth for authentication.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center">
          <Button
            onClick={handleLogout}
            disabled={loggingOut}
            className="bg-red-600 hover:bg-red-700"
          >
            {loggingOut ? 'Logging out...' : 'Logout'}
          </Button>
        </div>
      </div>
    </div>
  );
}
