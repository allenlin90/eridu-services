import usePrivateAxios from "@/hooks/use-private-axios";
import { useMutation } from "@tanstack/react-query";
import { HttpStatusCode } from "axios";

export const useVerifyUser = () => {
  const axios = usePrivateAxios();

  return useMutation({
    mutationKey: ["verify_user"],
    mutationFn: async () => {
      const res = await axios.post<null>("/users/verify");

      return res.status === HttpStatusCode.Ok || res.status === HttpStatusCode.Created;
    },
  });
};
