import { Button } from "@eridu/ui/components/button";
import { DateTimePicker24h } from "@eridu/ui/components/datetime-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@eridu/ui/components/dropdown-menu";
import { Input } from "@eridu/ui/components/input";
import { cn } from "@eridu/ui/lib/utils";
import debounce from "lodash.debounce";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

const DEBOUNCE_TIME = 300;

type Filter = "name" | "brand_id" | "start_time" | "end_time";

type ShowSearchFiltersProps = {
  error?: Error | null;
} & React.ComponentProps<"div">;

export const ShowSearchFilters: React.FC<ShowSearchFiltersProps> = (
  { className, ...props },
) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("name");

  const defaultInputValue = useMemo(() => {
    return searchParams.get(filter) || "";
  }, [searchParams, filter]);

  const inputPlaceholder = useMemo(() => {
    return `search by ${filter}`;
  }, [filter]);

  const updateSearchParams = useMemo(() =>
    debounce((value: string) => {
      setSearchParams((_prev) => {
        const newParams = new URLSearchParams();

        if (value) {
          newParams.set(filter, value);
        }
        else {
          newParams.delete(filter);
        }

        return newParams;
      });
    }, DEBOUNCE_TIME), [filter, setSearchParams]);

  const onChange: React.ChangeEventHandler<HTMLInputElement>
  = useCallback((e) => {
    const value = e.target.value.trim();
    updateSearchParams(value);
  }, [updateSearchParams]);

  const onDateTimeChange = useCallback((date: Date | null) => {
    const value = date ? date.toISOString() : "";
    updateSearchParams(value);
  }, [updateSearchParams]);

  return (
    <div className={cn("flex flex-start gap-4", className)} {...props}>
      <div className="flex flex-col w-full">
        <div className="flex-1 mb-2">
          {filter === "start_time" || filter === "end_time"
            ? (
                <DateTimePicker24h
                  onChange={onDateTimeChange}
                  value={defaultInputValue ? new Date(defaultInputValue) : undefined}
                />
              )
            : (
                <Input
                  type="text"
                  placeholder={inputPlaceholder}
                  defaultValue={defaultInputValue}
                  onChange={onChange}
                />
              )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Filters</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={filter} onValueChange={val => setFilter(val as Filter)}>
            <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="brand_id">Brand ID</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="start_time">Start Time</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="end_time">End Time</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
