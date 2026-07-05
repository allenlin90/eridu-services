import { useEffect, useState } from 'react';

import { Button } from '@eridu/ui';

import { authClient } from '../api/auth-client';

export function ConsentForm() {
  const searchParams = new URLSearchParams(window.location.search);
  const clientId = searchParams.get('client_id');
  const scopes = (searchParams.get('scope') ?? '').split(' ').filter(Boolean);

  const [clientName, setClientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(clientId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    authClient.oauth2
      .publicClient({ query: { client_id: clientId } })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message || 'Unable to load application details.');
        }
        setClientName(data?.client_name || clientId);
        setLoading(false);
      })
      .catch(() => {
        setError('Unable to load application details.');
        setClientName(clientId);
        setLoading(false);
      });
  }, [clientId]);

  const handleDecision = async (accept: boolean) => {
    setSubmitting(true);
    setError(null);

    try {
      const { data, error: consentError } = await authClient.oauth2.consent({ accept });

      if (consentError) {
        setError(consentError.message || 'Failed to process your decision.');
        setSubmitting(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      setSubmitting(false);
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error(err);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-4">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            Missing or invalid authorization request.
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
            Authorize application
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            <span className="font-medium">{clientName}</span>
            {' '}
            wants to access your account.
          </p>
        </div>
        <div className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}
          {scopes.length > 0 && (
            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">This will allow the application to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
                {scopes.map((scope) => (
                  <li key={scope}>{scope}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={submitting}
              onClick={() => handleDecision(false)}
            >
              Deny
            </Button>
            <Button
              type="button"
              className="w-full"
              disabled={submitting}
              onClick={() => handleDecision(true)}
            >
              {submitting ? 'Authorizing...' : 'Allow'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
