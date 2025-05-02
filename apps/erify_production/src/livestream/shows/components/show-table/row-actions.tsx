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

type RowActionsProps = {
  onCopyShowId: (_e: React.MouseEvent<HTMLDivElement>) => void;
  onShowDetails: (_e: React.MouseEvent<HTMLDivElement>) => void;
};

export const RowActions: React.FC<RowActionsProps>
= ({ onCopyShowId, onShowDetails }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={onCopyShowId}
        >
          Copy ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onShowDetails}>View details</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
