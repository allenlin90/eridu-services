export const CREATOR_UID_PREFIX = 'creator';
export const LEGACY_CREATOR_UID_PREFIX = 'mc';
export const VALID_CREATOR_UID_PREFIXES = [
  CREATOR_UID_PREFIX,
  LEGACY_CREATOR_UID_PREFIX,
] as const;

export function isCreatorUid(value: string): boolean {
  return VALID_CREATOR_UID_PREFIXES.some((prefix) =>
    value.startsWith(`${prefix}_`),
  );
}

export function toCreatorUid(value: string): string {
  if (!value.startsWith(`${LEGACY_CREATOR_UID_PREFIX}_`)) {
    return value;
  }
  return `${CREATOR_UID_PREFIX}_${value.slice(LEGACY_CREATOR_UID_PREFIX.length + 1)}`;
}

export function toLegacyCreatorUid(value: string): string {
  if (!value.startsWith(`${CREATOR_UID_PREFIX}_`)) {
    return value;
  }
  return `${LEGACY_CREATOR_UID_PREFIX}_${value.slice(CREATOR_UID_PREFIX.length + 1)}`;
}

export function expandCreatorUidCandidates(value: string): string[] {
  if (!isCreatorUid(value)) {
    return [value];
  }
  const creatorUid = toCreatorUid(value);
  const legacyUid = toLegacyCreatorUid(value);
  return Array.from(new Set([value, creatorUid, legacyUid]));
}
