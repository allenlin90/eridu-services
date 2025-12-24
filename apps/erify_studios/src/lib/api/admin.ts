import type { AdminResource } from './admin-resources';
import { ADMIN_RESOURCE_META } from './admin-resources';
import { apiClient } from './client';

/**
 * Pagination parameters for list queries
 */
export type PaginationParams = {
  page?: number;
  limit?: number;
  [key: string]: any; // Allow additional filter params
};

/**
 * Paginated response structure from admin API
 */
export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Type-safe admin API client
 * Only accepts AdminResource literal types - no arbitrary strings
 */
export const adminApi = {
  /**
   * List resources with pagination
   * @param resource - Must be one of the supported admin resources
   */
  list: async <T>(
    resource: AdminResource,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<T>> => {
    const apiPath = ADMIN_RESOURCE_META[resource].apiPath;
    const response = await apiClient.get<PaginatedResponse<T>>(
      `/admin/${apiPath}`,
      { params },
    );
    return response.data;
  },

  /**
   * Get a single resource by ID
   * @param resource - Must be one of the supported admin resources
   */
  get: async <T>(resource: AdminResource, id: string): Promise<T> => {
    const apiPath = ADMIN_RESOURCE_META[resource].apiPath;
    const response = await apiClient.get<T>(`/admin/${apiPath}/${id}`);
    return response.data;
  },

  /**
   * Create a new resource
   * @param resource - Must be one of the supported admin resources
   */
  create: async <T, D>(resource: AdminResource, data: D): Promise<T> => {
    const apiPath = ADMIN_RESOURCE_META[resource].apiPath;
    const response = await apiClient.post<T>(`/admin/${apiPath}`, data);
    return response.data;
  },

  /**
   * Update an existing resource
   * @param resource - Must be one of the supported admin resources
   */
  update: async <T, D>(
    resource: AdminResource,
    id: string,
    data: D,
  ): Promise<T> => {
    const apiPath = ADMIN_RESOURCE_META[resource].apiPath;
    const response = await apiClient.patch<T>(`/admin/${apiPath}/${id}`, data);
    return response.data;
  },

  /**
   * Delete a resource
   * @param resource - Must be one of the supported admin resources
   */
  delete: async (resource: AdminResource, id: string): Promise<void> => {
    const apiPath = ADMIN_RESOURCE_META[resource].apiPath;
    await apiClient.delete(`/admin/${apiPath}/${id}`);
  },

  /**
   * Extension point for custom POST operations
   * Path is relative to /admin/ and not type-constrained
   * Use this for resource-specific endpoints like schedules/:id/publish
   */
  post: async <T>(path: string, data?: any): Promise<T> => {
    const response = await apiClient.post<T>(`/admin/${path}`, data);
    return response.data;
  },

  /**
   * Extension point for custom PATCH operations
   */
  patch: async <T>(path: string, data?: any): Promise<T> => {
    const response = await apiClient.patch<T>(`/admin/${path}`, data);
    return response.data;
  },

  /**
   * Extension point for custom GET operations
   */
  customGet: async <T>(path: string, params?: any): Promise<T> => {
    const response = await apiClient.get<T>(`/admin/${path}`, { params });
    return response.data;
  },
};
