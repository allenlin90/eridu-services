export const STUDIO_MEMBERSHIP_TASK_HELPER_KEY = 'task_helper_enabled' as const;

type MembershipMetadata = Record<string, unknown> | null | undefined;

export function isStudioMembershipTaskHelper(metadata: MembershipMetadata): boolean {
  if (!metadata || typeof metadata !== 'object')
    return false;
  return metadata[STUDIO_MEMBERSHIP_TASK_HELPER_KEY] === true;
}

export function withStudioMembershipTaskHelper(
  metadata: MembershipMetadata,
  isHelper: boolean,
): Record<string, unknown> {
  return {
    ...(metadata && typeof metadata === 'object' ? metadata : {}),
    [STUDIO_MEMBERSHIP_TASK_HELPER_KEY]: isHelper,
  };
}
