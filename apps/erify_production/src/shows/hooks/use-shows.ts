import usePrivateAxios from "@/hooks/use-private-axios";
import { useQuery } from "@tanstack/react-query";

export const useShows = () => {
  const axios = usePrivateAxios();

  return useQuery({
    queryKey: ["shows"],
    queryFn: async () => {
      const { data } = await axios.get("/shows");
      return data;
    },
    refetchOnWindowFocus: false,
  });
};
