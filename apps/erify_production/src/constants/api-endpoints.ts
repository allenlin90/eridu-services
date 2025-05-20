export const API_ENDPOINTS = {
  SHOWS: {
    BASE: "/shows",
    DETAILS: (showId: string) => `/shows/${showId}`,
    MATERIALS: (showId: string) => `/shows/${showId}/materials`,
  },
  ADMIN: {
    USERS: "/admin/users",
  },
  ERIFY: {
    ADMIN: {
      BASE: "/erify/admin",
      BRANDS: "/erify/admin/brands",
      BRAND_DETAILS: (brandUid: string) => `/erify/admin/brands/${brandUid}`,
      MATERIALS: "/erify/admin/materials",
      PLATFORMS: "/erify/admin/platforms",
      SHOWS: "/erify/admin/shows",
      STUDIOS: "/erify/admin/studios",
      MCS: "/erify/admin/mcs",
      OPERATORS: "/erify/admin/operators",
      USERS: "/erify/admin/users",
    },
  },
};
