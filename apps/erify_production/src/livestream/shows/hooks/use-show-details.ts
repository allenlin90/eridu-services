import type { ShowDetails } from "@/livestream/shows/types/show-details";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { API_ENDPOINTS } from "@/constants/api-endpoints";
import { usePrivateAxios } from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

export const useShowDetails = (showId: string, option?: UseQueryOptions<ShowDetails, AxiosError<{ message?: string }>>) => {
  const axios = usePrivateAxios();

  return useQuery({
    queryKey: ["show", showId],
    queryFn: async () => {
      const { data } = await axios.get<ShowDetails>(API_ENDPOINTS.SHOWS.DETAILS(showId!));

      return data;
    },
    enabled: !!showId,
    ...option,
  });
};
