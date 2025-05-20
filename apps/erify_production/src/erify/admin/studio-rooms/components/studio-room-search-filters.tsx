import type { StudioRoom } from "@/erify/types";

import { Button } from "@eridu/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@eridu/ui/components/dropdown-menu";
import { Input } from "@eridu/ui/components/input";
import { cn } from "@eridu/ui/lib/utils";
import debounce from "lodash.debounce";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

const DEBOUNCE_TIME = 300;

type Filter = "name" | "room_type" | "studio_uid";

type StudioRoomSearchFiltersProps = {
  error?: Error | null;
} & React.ComponentProps<"div">;

export const StudioRoomSearchFilters: React.FC<StudioRoomSearchFiltersProps> = (
  { className, ...props },
) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("name");
  const [type, setType] = useState<StudioRoom["type"] | null>(searchParams.get("room_type") as StudioRoom["type"] | null);

  const defaultInputValue = useMemo(() => {
    return searchParams.get("studio_uid") || searchParams.get("name") || "";
  }, [searchParams]);

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

  const onChangeType = useCallback((val: string) => {
    setType((prev) => {
      if (prev === val) {
        return null;
      }

      return val as StudioRoom["type"];
    });

    setSearchParams((prev) => {
      const type = prev.get("room_type");
      const newParams = new URLSearchParams();

      if (!type || type !== val) {
        newParams.set("room_type", val);
      }
      else {
        newParams.delete("room_type");
      }

      return newParams;
    });
  }, [setSearchParams]);

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
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Filters</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={filter} onValueChange={val => setFilter(val as Filter)}>
            <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="studio_uid">Studio UID</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Studio Type</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={type || ""}
                onValueChange={onChangeType}
              >
                <DropdownMenuRadioItem value="s">Size S</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="m">Size M</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="l">Size L</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
