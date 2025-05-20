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
      MATERIAL_DETAILS: (materialUid: string) => `/erify/admin/materials/${materialUid}`,
      PLATFORMS: "/erify/admin/platforms",
      PLATFORM_DETAILS: (platformUid: string) => `/erify/admin/platforms/${platformUid}`,
      SHOWS: "/erify/admin/shows",
      SHOW_DETAILS: (showUid: string) => `/erify/admin/shows/${showUid}`,
      STUDIOS: "/erify/admin/studios",
      STUDIO_DETAILS: (studioUid: string) => `/erify/admin/studios/${studioUid}`,
      MCS: "/erify/admin/mcs",
      MC_DETAILS: (mcUid: string) => `/erify/admin/mcs/${mcUid}`,
      OPERATORS: "/erify/admin/operators",
      OPERATOR_DETAILS: (operatorUid: string) => `/erify/admin/operators/${operatorUid}`,
      USERS: "/erify/admin/users",
      USER_DETAILS: (userUid: string) => `/erify/admin/users/${userUid}`,
    },
  },
};
