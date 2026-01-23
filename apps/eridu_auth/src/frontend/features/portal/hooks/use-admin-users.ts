import { useCallback, useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { authClient } from '@/frontend/features/auth/api/auth-client';
import type { ExtendedUser } from '@/lib/types';

export function useAdminUsers(initialPageSize = 10) {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 500);

  const loadUsers = useCallback(async (index: number = pageIndex, size: number = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const offset = index * size;
      const result = await authClient.admin.listUsers({
        query: {
          limit: size,
          offset,
          searchValue: debouncedSearch || undefined,
          sortBy: 'createdAt',
          sortDirection: 'desc',
        },
      });

      if (result.error) {
        setError(result.error.message || 'Failed to load users');
      } else if (result.data) {
        setUsers(result.data.users as ExtendedUser[]);
        setTotal(result.data.total);
        if (index !== pageIndex) {
          setPageIndex(index);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, pageIndex, pageSize]);

  // Load users on search/pagination change
  useEffect(() => {
    loadUsers(pageIndex, pageSize);
  }, [debouncedSearch, pageIndex, pageSize, loadUsers]);

  // Reset pagination when search changes
  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch]);

  const refresh = useCallback(() => {
    return loadUsers(pageIndex, pageSize);
  }, [loadUsers, pageIndex, pageSize]);

  return {
    users,
    total,
    loading,
    error,
    pageIndex,
    pageSize,
    search,
    setSearch,
    setPageIndex,
    setPageSize,
    refresh,
    pageCount: Math.ceil(total / pageSize),
  };
}
