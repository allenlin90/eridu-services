import { Button } from "@eridu/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@eridu/ui/components/dropdown-menu";
import { Input } from "@eridu/ui/components/input";
import { cn } from "@eridu/ui/lib/utils";
import debounce from "lodash.debounce";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

const DEBOUNCE_TIME = 300;

type Filter = "name" | "user_id" | "mc_id";

type McSearchFiltersProps = {
  error?: Error | null;
} & React.ComponentProps<"div">;

export const McSearchFilters: React.FC<McSearchFiltersProps> = (
  { className, ...props },
) => {
  const [filter, setFilter] = useState<Filter>("name");
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState<string>("");

  const defaultInputValue = useMemo(() => {
    return searchParams.get("name") || searchParams.get("user_id") || searchParams.get("mc_id") || "";
  }, [searchParams]);

  const inputPlaceholder = useMemo(() => {
    let placeholder = filter as string;

    if (filter === "mc_id") {
      placeholder = "mc ID";
    }

    if (filter === "user_id") {
      placeholder = "user ID";
    }

    return `search by ${placeholder}`;
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

    setError(""); // Clear error for non-email filters
    updateSearchParams(value);
  }, [updateSearchParams]);

  return (
    <div className={cn("flex flex-start gap-4", className)} {...props}>
      <div className="flex flex-col w-full">
        <div className="flex-1 mb-2">
          <Input
            type="text"
            placeholder={inputPlaceholder}
            defaultValue={defaultInputValue}
            onChange={onChange}
          />
        </div>
        <p className="text-red-500 text-sm pl-4">{error}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Filters</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={filter} onValueChange={val => setFilter(val as Filter)}>
            <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="mc_id">MC ID</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="user_id">User ID</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
