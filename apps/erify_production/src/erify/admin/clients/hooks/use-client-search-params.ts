import { useMemo } from "react";
import { useSearchParams } from "react-router";

export const useClientSearchParams = () => {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    return {
      params: {
        name: searchParams.get("name"),
      },
      error: null,
    };
  }, [searchParams]);
};

export default useClientSearchParams;
