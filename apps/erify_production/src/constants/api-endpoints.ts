export const API_ENDPOINTS = {
  SHOWS: {
    BASE: "/shows",
    DETAILS: (showId: string) => `/shows/${showId}`,
    MATERIALS: (showId: string) => `/shows/${showId}/materials`,
  },
};
