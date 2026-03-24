/**
 * Use repeated query keys for arrays (`key=a&key=b`) instead of bracketed
 * notation (`key[]=a&key[]=b`) so Nest query DTOs receive canonical keys.
 */
export const apiQueryParamsSerializer = {
  indexes: null,
} as const;
