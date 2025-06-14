export const API_ENDPOINTS = {
  SHOWS: {
    BASE: "/shows",
    DETAILS: (showId: string) => `/shows/${showId}`,
    MATERIALS: (showId: string) => `/shows/${showId}/materials`,
  },
  ERIFY: {
    ADMIN: {
      BASE: "/admin",
      CLIENTS: "/admin/clients",
      CLIENT_DETAILS: (clientId: string) => `/admin/clients/${clientId}`,
      MATERIALS: "/admin/materials",
      MATERIAL_DETAILS: (materialId: string) => `/admin/materials/${materialId}`,
      PLATFORMS: "/admin/platforms",
      PLATFORM_DETAILS: (platformId: string) => `/admin/platforms/${platformId}`,
      SHOWS: "/admin/shows",
      SHOW_DETAILS: (showId: string) => `/admin/shows/${showId}`,
      STUDIO_ROOMS: "/admin/studio-rooms",
      STUDIO_ROOM_DETAILS: (studioRoomId: string) => `/admin/studio-rooms/${studioRoomId}`,
      STUDIOS: "/admin/studios",
      STUDIO_DETAILS: (studioId: string) => `/admin/studios/${studioId}`,
      MCS: "/admin/mcs",
      MC_DETAILS: (mcId: string) => `/admin/mcs/${mcId}`,
      OPERATORS: "/admin/operators",
      OPERATOR_DETAILS: (operatorId: string) => `/admin/operators/${operatorId}`,
      USERS: "/admin/users",
      USER_DETAILS: (userId: string) => `/admin/users/${userId}`,
    },
  },
};
