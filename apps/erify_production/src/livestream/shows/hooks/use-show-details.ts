import { API_ENDPOINTS } from "@/constants/api-endpoints";
import usePrivateAxios from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

import type { ShowDetails } from "../types/show-details";

export const useShowDetails = (showId?: string) => {
  const axios = usePrivateAxios();

  return useQuery({
    queryKey: ["show", showId],
    queryFn: async () => {
      const { data } = await axios.get<ShowDetails>(API_ENDPOINTS.SHOWS.DETAILS(showId!));

      return data;
    },
    enabled: !!showId,
  });
};
