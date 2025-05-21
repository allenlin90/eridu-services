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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@eridu/ui/components/sheet";
import { cn } from "@eridu/ui/lib/utils";
import debounce from "lodash.debounce";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

const DEBOUNCE_TIME = 300;

type Filter = "name" | "brand_id";

type ShowSearchFiltersProps = {
  error?: Error | null;
} & React.ComponentProps<"div">;

export const ShowSearchFilters: React.FC<React.PropsWithChildren<ShowSearchFiltersProps>> = (
  { className, children, ...props },
) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("name");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const defaultInputValue = useMemo(() => {
    return searchParams.get(filter) || "";
  }, [searchParams, filter]);

  const startTimeValue = useMemo(() => {
    return searchParams.get("start_time") || "";
  }, [searchParams]);

  const endTimeValue = useMemo(() => {
    return searchParams.get("end_time") || "";
  }, [searchParams]);

  const inputPlaceholder = useMemo(() => {
    return `search by ${filter}`;
  }, [filter]);

  const updateSearchParams = useMemo(() =>
    debounce((key: string, value: string) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);

        if (value) {
          newParams.set(key, value);
        }
        else {
          newParams.delete(key);
        }

        return newParams;
      });
    }, DEBOUNCE_TIME), [setSearchParams]);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    const value = e.target.value.trim();
    updateSearchParams(filter, value);
  }, [filter, updateSearchParams]);

  const onFilterChange = useCallback((val: string) => {
    setFilter(val as Filter);
  }, []);

  const onDateTimeChange = useCallback((date: Date | null, key: string) => {
    const value = date ? date.toISOString() : "";
    updateSearchParams(key, value);
  }, [updateSearchParams]);

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      {/* Desktop View */}
      <div className="hidden sm:flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder={inputPlaceholder}
              defaultValue={defaultInputValue}
              onChange={onChange}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Filters</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={filter} onValueChange={onFilterChange}>
                <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="brand_id">Brand ID</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {children}
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <DateTimePicker24h
              onChange={date => onDateTimeChange(date, "start_time")}
              value={startTimeValue ? new Date(startTimeValue) : undefined}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <DateTimePicker24h
              onChange={date => onDateTimeChange(date, "end_time")}
              value={endTimeValue ? new Date(endTimeValue) : undefined}
            />
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="flex flex-col gap-4 sm:hidden">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder={inputPlaceholder}
              defaultValue={defaultInputValue}
              onChange={onChange}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Filters</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={filter} onValueChange={onFilterChange}>
                <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="brand_id">Brand ID</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="w-full text-left">Set Start and End Time</Button>
                </SheetTrigger>
              </Sheet>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Set Time Filters</SheetTitle>
              <SheetDescription />
            </SheetHeader>
            <div className="flex flex-col gap-4 p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <DateTimePicker24h
                  onChange={date => onDateTimeChange(date, "start_time")}
                  value={startTimeValue ? new Date(startTimeValue) : undefined}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <DateTimePicker24h
                  onChange={date => onDateTimeChange(date, "end_time")}
                  value={endTimeValue ? new Date(endTimeValue) : undefined}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
