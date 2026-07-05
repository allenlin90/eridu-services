import { useState } from 'react';

import { AdminOAuthClientCreate } from './admin-oauth-client-create';
import { AdminOAuthClientList } from './admin-oauth-client-list';

import type { ExtendedUser } from '@/lib/types';
import { hasRole } from '@/lib/types';

type AdminOAuthClientManagementProps = {
  currentUser: ExtendedUser;
};

export function AdminOAuthClientManagement({ currentUser }: AdminOAuthClientManagementProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  if (!hasRole(currentUser, 'admin')) {
    return null;
  }

  return (
    <div className="mt-8 overflow-hidden rounded-lg bg-white shadow">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">OAuth Clients</h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage OAuth/OIDC clients for downstream applications such as Open WebUI
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${activeTab === 'list'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Clients
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${activeTab === 'create'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Create Client
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'list' && <AdminOAuthClientList />}
        {activeTab === 'create' && <AdminOAuthClientCreate />}
      </div>
    </div>
  );
}
