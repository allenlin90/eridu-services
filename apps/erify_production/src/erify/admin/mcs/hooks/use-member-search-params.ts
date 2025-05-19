import { useMemo } from "react";
import { useSearchParams } from "react-router";

export const useMemberSearchParams = () => {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    return {
      params: {
        name: searchParams.get("name"),
        user_id: searchParams.get("user_id"),
        mc_id: searchParams.get("mc_id"),
      },
      error: null,
    };
  }, [searchParams]);
};

export default useMemberSearchParams;
