import { Button } from "@eridu/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@eridu/ui/components/dropdown-menu";
import { Input } from "@eridu/ui/components/input";
import { cn } from "@eridu/ui/lib/utils";
import debounce from "lodash.debounce";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

const DEBOUNCE_TIME = 300;

type Filter = "email" | "name";

const emailSchema = z.string().email("Invalid email address");

type UserSearchFiltersProps = {
  error?: Error | null;
} & React.ComponentProps<"div">;

export const UserSearchFilters: React.FC<UserSearchFiltersProps> = (
  { className, ...props },
) => {
  const [filter, setFilter] = useState<Filter>("email");
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState<string>("");

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

    if (filter === "email") {
      try {
        value && emailSchema.parse(value); // Validate email
        setError(""); // Clear error if valid
        updateSearchParams(value);
      }
      catch (err) {
        setError((err as z.ZodError).errors[0]?.message || "Invalid input");
      }
    }
    else {
      setError(""); // Clear error for non-email filters
      updateSearchParams(value);
    }
  }, [filter, updateSearchParams]);

  return (
    <div className={cn("flex flex-start gap-4", className)} {...props}>
      <div className="flex flex-col w-full">
        <div className="mb-2">
          <Input
            className="w-full min-w-64"
            defaultValue={(searchParams.get("email") || searchParams.get("name")) ?? ""}
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
            <DropdownMenuRadioItem value="email">Email</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
