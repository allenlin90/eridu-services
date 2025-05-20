export const API_ENDPOINTS = {
  SHOWS: {
    BASE: "/shows",
    DETAILS: (showId: string) => `/shows/${showId}`,
    MATERIALS: (showId: string) => `/shows/${showId}/materials`,
  },
  ERIFY: {
    ADMIN: {
      BASE: "/admin",
      BRANDS: "/admin/brands",
      BRAND_DETAILS: (brandUid: string) => `/admin/brands/${brandUid}`,
      MATERIALS: "/admin/materials",
      MATERIAL_DETAILS: (materialUid: string) => `/admin/materials/${materialUid}`,
      PLATFORMS: "/admin/platforms",
      PLATFORM_DETAILS: (platformUid: string) => `/admin/platforms/${platformUid}`,
      SHOWS: "/admin/shows",
      SHOW_DETAILS: (showUid: string) => `/admin/shows/${showUid}`,
      STUDIO_ROOMS: "/admin/studio-rooms",
      STUDIOS: "/admin/studios",
      STUDIO_DETAILS: (studioUid: string) => `/admin/studios/${studioUid}`,
      MCS: "/admin/mcs",
      MC_DETAILS: (mcUid: string) => `/admin/mcs/${mcUid}`,
      OPERATORS: "/admin/operators",
      OPERATOR_DETAILS: (operatorUid: string) => `/admin/operators/${operatorUid}`,
      USERS: "/admin/users",
      USER_DETAILS: (userUid: string) => `/admin/users/${userUid}`,
    },
  },
};
