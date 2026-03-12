export const CREATOR_UID_PREFIX = 'creator';

export function isCreatorUid(value: string): boolean {
  return value.startsWith(`${CREATOR_UID_PREFIX}_`);
}
