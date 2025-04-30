import { DatePickerWithRange } from "@eridu/ui/components/date-picker-with-range";
import { format, parse } from "date-fns";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

type DatePickerWithRangeProps = React.ComponentProps<typeof DatePickerWithRange>;
type DateRange = NonNullable<DatePickerWithRangeProps["initialDateRange"]>;
type SelectDateHandler = NonNullable<DatePickerWithRangeProps["onSelect"]>;

export const DateRangePicker = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse the query parameters to initialize the date range
  const initialDateRange = useMemo<DateRange | undefined>(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (from && to) {
      return {
        from: parse(from, "yyyy-MM-dd", new Date()),
        to: parse(to, "yyyy-MM-dd", new Date()),
      };
    }

    return undefined;
  }, [searchParams]);

  const onSelect = useCallback<SelectDateHandler>(
    (dateRange) => {
      if (dateRange) {
        const { to, from } = dateRange as DateRange;

        if (to && from) {
          setSearchParams({
            from: format(from!, "yyyy-MM-dd"),
            to: format(to!, "yyyy-MM-dd"),
          });
        }
      }
    },
    [setSearchParams],
  );

  return <DatePickerWithRange initialDateRange={initialDateRange} onSelect={onSelect} />;
};
