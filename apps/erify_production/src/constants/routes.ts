export const ROUTES = {
  LOGIN: "/login",
  FORGET_PASSWORD: "/forget-password",
  RESET_PASSWORD: "/reset-password",
  DASHBOARD: "/",
  INVITATIONS: {
    INVITATION_DETAILS: (invitationId: string) => `/invitations/${invitationId}`,
  },
  LIVESTREAM: {
    BASE: "/livestream",
    SHOWS: "/livestream/shows",
    SHOW_DETAILS: (showUid: string) => `/livestream/shows/${showUid}`,
  },
  ADMIN: {
    BASE: "/admin",
    USERS: "/admin/users",
    ORGANIZATION_DETAILS: (organizationUid: string) => `/admin/organizations/${organizationUid}`,
  },
  ERIFY: {
    BASE: "/erify",
    ONSET: {
      BASE: "/erify/onset",
      INVENTORY: "/erify/onset/inventory",
      PRE_PRODUCTION: "/erify/onset/pre-production",
      POST_PRODUCTION: "/erify/onset/post-production",
    },
    OFFSET: {
      BASE: "/erify/offset",
      MC_ADMIN: "/erify/offset/mc-admin",
      SCRIPT: "/erify/offset/script",
      SCENE: "/erify/offset/scene",
    },
    ADMIN: {
      BASE: "/erify/admin",
      BRANDS: "/erify/admin/brands",
      MATERIALS: "/erify/admin/materials",
      PLATFORMS: "/erify/admin/platforms",
      SHOWS: "/erify/admin/shows",
      STUDIOS: "/erify/admin/studios",
      STUDIOS_DETAIL: (studioUid: string) => `/erify/admin/studios/${studioUid}`,
      MCS: "/erify/admin/mcs",
      OPERATORS: "/erify/admin/operators",
      USERS: "/erify/admin/users",
      USER_DETAILS: (userUid: string) => `/erify/admin/users/${userUid}`,
    },
  },
};
