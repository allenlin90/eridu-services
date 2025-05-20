import { useMemo } from "react";
import { useSearchParams } from "react-router";

export const useStudioRoomSearchParams = () => {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    return {
      params: {
        name: searchParams.get("name"),
        room_type: searchParams.get("room_type"),
        studio_uid: searchParams.get("studio_uid"),
      },
      error: null,
    };
  }, [searchParams]);
};

export default useStudioRoomSearchParams;
