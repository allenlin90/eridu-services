import usePrivateAxios from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

export const useMaterials = (showId?: string) => {
  const axios = usePrivateAxios();

  return useQuery({
    queryKey: ["materials", showId],
    queryFn: async () => {
      const { data } = await axios.get(`/shows/${showId}/materials`);

      return data;
    },
    enabled: !!showId,
  });
};
