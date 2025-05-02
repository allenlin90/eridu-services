import usePrivateAxios from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

export const useShowDetails = (showId?: string) => {
  const axios = usePrivateAxios();

  return useQuery({
    queryKey: ["show", showId],
    queryFn: async () => {
      const { data } = await axios.get(`/shows/${showId}`);

      return data;
    },
    enabled: !!showId,
  });
};
