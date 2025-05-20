import { useMemo } from "react";
import { useSearchParams } from "react-router";

export const useStudioSearchParams = () => {
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

export default useStudioSearchParams;
