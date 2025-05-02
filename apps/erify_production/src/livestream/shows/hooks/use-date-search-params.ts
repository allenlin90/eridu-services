import { useDateRangeParams } from "@/hooks/use-date-range-params";
import { addHours, parse } from "date-fns";
import { useMemo } from "react";

const DAY_START_HOUR = 4; // 4 am
const DAY_INCLUSIVE_NEXT_DAY = 24 + DAY_START_HOUR; // hours, 4 am next day

export const useDateSearchParams = () => {
  const { params, error } = useDateRangeParams();

  return useMemo(() => {
    const now = new Date();
    const { from_date, to_date } = params;

    let start_time: string | null = null;
    let end_time: string | null = null;

    if (from_date) {
      const fromDate = parse(from_date, "yyyy-MM-dd", now);
      start_time = addHours(fromDate, DAY_START_HOUR).toISOString();
    }

    if (to_date) {
      const toDate = parse(to_date, "yyyy-MM-dd", now).toISOString();
      end_time = addHours(toDate, DAY_INCLUSIVE_NEXT_DAY).toISOString();
    }

    return {
      params: {
        start_time,
        end_time,
      },
      error,
    };
  }, [error, params]);
};
