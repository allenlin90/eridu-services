export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/",
  LIVESTREAM: {
    BASE: "/livestream",
    SHOWS: "/livestream/shows",
    SHOW_DETAILS: (showUid: string) => `/livestream/shows/${showUid}`,
  },
  ERIFY: {
    BASE: "/erify",
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
      TEAMS: "/erify/admin/teams",
      USERS: "/erify/admin/users",
      USER_DETAILS: (userUid: string) => `/erify/admin/users/${userUid}`,
    },
  },
};
