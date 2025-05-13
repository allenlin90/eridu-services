import { useMemo } from "react";
import { useSearchParams } from "react-router";

export const useUserSearchParams = () => {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    return {
      params: {
        email: searchParams.get("email"),
        name: searchParams.get("name"),
      },
      error: null,
    };
  }, [searchParams]);
};

export default useUserSearchParams;
