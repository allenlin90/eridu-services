import { isValid, parse } from "date-fns";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

export const useDateRangeParams = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<Error | null>(null);

  const dateRange = useMemo(() => {
    const to = searchParams.get("to");
    const from = searchParams.get("from");

    const parsedFrom = from ? parse(from, "yyyy-MM-dd", new Date()) : null;
    const parsedTo = to ? parse(to, "yyyy-MM-dd", new Date()) : null;

    if ((from && !isValid(parsedFrom)) || (to && !isValid(parsedTo))) {
      setError(new Error("Invalid date format. Expected yyyy-MM-dd."));
      return { from_date: null, to_date: null };
    }

    return { from_date: from, to_date: to };
  }, [searchParams]);

  return { params: dateRange, error };
};
