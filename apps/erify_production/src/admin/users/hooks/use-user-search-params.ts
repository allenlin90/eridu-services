import type { AuthClient } from "@eridu/auth-service/types";

import { useMemo } from "react";
import { useSearchParams } from "react-router";

type Filter = Parameters<AuthClient["admin"]["listUsers"]>[0]["query"]["searchField"];

export const useUserSearchParams = () => {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const searchField = searchParams.get("searchField") as Filter ?? undefined;

    return {
      params: {
        searchField,
        searchValue: searchParams.get("searchValue") || "",
      },
      error: null,
    };
  }, [searchParams]);
};

export default useUserSearchParams;
