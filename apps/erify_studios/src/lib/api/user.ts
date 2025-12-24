import type { ProfileResponse } from '@eridu/api-types/users';

import { apiRequest } from '@/lib/api/client';

export async function getUserProfile() {
  return apiRequest<ProfileResponse>({
    method: 'GET',
    url: '/me',
  });
}
