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
    ADMIN: {
      BASE: "/erify/admin",
      BRANDS: "/erify/admin/brands",
      MATERIALS: "/erify/admin/materials",
      PLATFORMS: "/erify/admin/platforms",
      SHOWS: "/erify/admin/shows",
      STUDIOS: "/erify/admin/studios",
      TEAMS: "/erify/admin/teams",
      USERS: "/erify/admin/users",
    },
  },
};
