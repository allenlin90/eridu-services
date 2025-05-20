import { Input } from "@eridu/ui/components/input";
import { cn } from "@eridu/ui/lib/utils";
import debounce from "lodash.debounce";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

const DEBOUNCE_TIME = 300;

type PlatformSearchFiltersProps = React.ComponentProps<"div">;

export const PlatformSearchFilters: React.FC<PlatformSearchFiltersProps> = ({ className, ...props }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const defaultInputValue = useMemo(() => searchParams.get("name") || "", [searchParams]);

  const updateSearchParams = useMemo(
    () =>
      debounce((value: string) => {
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);

          if (value) {
            newParams.set("name", value);
          }
          else {
            newParams.delete("name");
          }

          return newParams;
        });
      }, DEBOUNCE_TIME),
    [setSearchParams],
  );

  const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const value = e.target.value.trim();
      updateSearchParams(value);
    },
    [updateSearchParams],
  );

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <Input
        type="text"
        placeholder="Search by name"
        defaultValue={defaultInputValue}
        onChange={onChange}
      />
    </div>
  );
};
