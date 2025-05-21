import { useMemo } from "react";
import { useSearchParams } from "react-router";

export const useStudioRoomSearchParams = () => {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    return {
      params: {
        name: searchParams.get("name"),
        room_type: searchParams.get("room_type"),
        studio_id: searchParams.get("studio_id"),
      },
      error: null,
    };
  }, [searchParams]);
};

export default useStudioRoomSearchParams;
