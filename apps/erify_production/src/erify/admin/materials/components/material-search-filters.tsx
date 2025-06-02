import { Button } from "@eridu/ui/components/button";
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

type Filter = "name" | "type" | "client_id";

type MaterialSearchFiltersProps = React.ComponentProps<"div">;

export const MaterialSearchFilters: React.FC<MaterialSearchFiltersProps> = ({
  className,
  ...props
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("name");

  const defaultInputValue = useMemo(() => {
    return searchParams.get(filter) || "";
  }, [searchParams, filter]);

  const inputPlaceholder = useMemo(() => `search by ${filter}`, [filter]);

  const updateSearchParams = useMemo(
    () =>
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
      }, DEBOUNCE_TIME),
    [setSearchParams],
  );

  const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const value = e.target.value.trim();
      updateSearchParams(filter, value);
    },
    [filter, updateSearchParams],
  );

  const onFilterChange = useCallback((val: string) => {
    setFilter(val as Filter);
  }, []);

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
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
            <DropdownMenuRadioGroup
              value={filter}
              onValueChange={onFilterChange}
            >
              <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="type">Type</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="client_id">Client ID</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
