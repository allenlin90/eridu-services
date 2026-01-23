import { useState } from 'react';

import { AdminUserCreate } from './admin-user-create';
import { AdminUserList } from './admin-user-list';
import { AdminUserPassword } from './admin-user-password';

import type { ExtendedUser } from '@/lib/types';
import { hasRole } from '@/lib/types';

type AdminUserManagementProps = {
  currentUser: ExtendedUser;
};

export function AdminUserManagement({ currentUser }: AdminUserManagementProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'password' | 'create'>('list');

  // Check if current user is admin
  if (!hasRole(currentUser, 'admin')) {
    return null;
  }

  return (
    <div className="mt-8 overflow-hidden rounded-lg bg-white shadow">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Admin Tools</h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage users, passwords, and roles
        </p>
      </div>

      {/* Tabs */}
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
            User List
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${activeTab === 'password'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Set Password
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${activeTab === 'create'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Create User
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'list' && <AdminUserList />}
        {activeTab === 'password' && <AdminUserPassword />}
        {activeTab === 'create' && <AdminUserCreate />}
      </div>
    </div>
  );
}
