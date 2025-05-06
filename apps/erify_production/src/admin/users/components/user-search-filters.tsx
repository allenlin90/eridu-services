import { Button } from "@eridu/ui/components/button";
import { DropdownMenu, DropdownMenuTrigger } from "@eridu/ui/components/dropdown-menu";
import { Input } from "@eridu/ui/components/input";
import { cn } from "@eridu/ui/lib/utils";

type UserSearchFiltersProps = {

} & React.ComponentProps<"div">;

export const UserSearchFilters: React.FC<UserSearchFiltersProps> = (
  { className, ...props },
) => {
  return (
    <div className={cn("flex flex-start gap-4", className)} {...props}>
      <Input className="w-full" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Filters</Button>
        </DropdownMenuTrigger>
      </DropdownMenu>
    </div>
  );
};
