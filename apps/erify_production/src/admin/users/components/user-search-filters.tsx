import type { AuthClient } from "@eridu/auth-service/types";

import { Button } from "@eridu/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@eridu/ui/components/dropdown-menu";
import { Input } from "@eridu/ui/components/input";
import { cn } from "@eridu/ui/lib/utils";
import debounce from "lodash.debounce";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

const DEBOUNCE_TIME = 300;

type Filter = Parameters<AuthClient["admin"]["listUsers"]>[0]["query"]["searchField"];

const emailSchema = z.string().email("Invalid email address");

type UserSearchFiltersProps = {
  error?: Error | null;
} & React.ComponentProps<"div">;

export const UserSearchFilters: React.FC<UserSearchFiltersProps> = (
  { className, ...props },
) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>((searchParams.get("searchField") || "email") as Filter);
  const [error, setError] = useState<string>("");

  const defaultInputValue = useMemo(() => {
    return searchParams.get("searchValue") || "";
  }, [searchParams]);

  const inputPlaceholder = useMemo(() => {
    return `search by ${filter}`;
  }, [filter]);

  const updateSearchFilter = useCallback((filter: string) => {
    setFilter(filter as Filter);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);

      if (filter) {
        newParams.set("searchField", filter);
      }

      return newParams;
    });
  }, [setSearchParams]);

  const updateSearchParams = useMemo(() =>
    debounce((value: string) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);

        if (value) {
          newParams.set("searchValue", value);
        }
        else {
          newParams.delete("searchValue");
        }

        return newParams;
      });
    }, DEBOUNCE_TIME), [setSearchParams]);

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
        <div className="flex-1 mb-2">
          <Input
            type={filter === "email" ? "email" : "text"}
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
          <DropdownMenuRadioGroup value={filter} onValueChange={updateSearchFilter}>
            <DropdownMenuRadioItem value="email">Email</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
