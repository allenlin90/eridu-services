import { useMemo } from "react";
import { useSearchParams } from "react-router";

export const useMemberSearchParams = () => {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    return {
      params: {
        name: searchParams.get("name"),
        id: searchParams.get("id"),
        email: searchParams.get("email"),
        ext_id: searchParams.get("ext_id"),
        banned: searchParams.get("banned") === "true" ? true : null,
        ranking: searchParams.get("ranking"),
      },
      error: null,
    };
  }, [searchParams]);
};

export default useMemberSearchParams;
