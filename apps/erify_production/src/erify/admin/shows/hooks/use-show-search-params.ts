import { useMemo } from "react";
import { useSearchParams } from "react-router";

export const useShowSearchParams = () => {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    return {
      params: {
        name: searchParams.get("name"),
        show_id: searchParams.get("show_id"),
        client_id: searchParams.get("client_id"),
        start_time: searchParams.get("start_time"),
        end_time: searchParams.get("end_time"),
        studio_room_id: searchParams.get("studio_room_id"),
      },
      error: null,
    };
  }, [searchParams]);
};

export default useShowSearchParams;
