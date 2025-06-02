import { useMemo } from "react";
import { useSearchParams } from "react-router";

export function useMaterialSearchParams() {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    return {
      params: {
        name: searchParams.get("name"),
        type: searchParams.get("type"),
        client_id: searchParams.get("client_id"),
      },
      error: null,
    };
  }, [searchParams]);
}

export default useMaterialSearchParams;
