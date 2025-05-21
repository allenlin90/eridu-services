import { useMemo } from "react";
import { useSearchParams } from "react-router";

export const useShowSearchParams = () => {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    return {
      params: {
        name: searchParams.get("name"),
        show_id: searchParams.get("show_id"),
        brand_id: searchParams.get("brand_id"),
        start_time: searchParams.get("start_time"),
        end_time: searchParams.get("end_time"),
      },
      error: null,
    };
  }, [searchParams]);
};

export default useShowSearchParams;
