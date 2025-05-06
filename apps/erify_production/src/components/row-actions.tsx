import { Button } from "@eridu/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@eridu/ui/components/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

type Action = {
  name: string;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void | Promise<void>;
};

type RowActionsProps = {
  actionHeader?: string;
  actions: Action[];
};

export const RowActions: React.FC<React.PropsWithChildren<RowActionsProps>> = (
  { actionHeader = "Actions", actions, children },
) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{actionHeader}</DropdownMenuLabel>
        {actions.map(action => (
          <DropdownMenuItem
            key={action.name}
            onClick={action.onClick}
          >
            {action.name}
          </DropdownMenuItem>
        ))}
        {children && <DropdownMenuSeparator />}
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
