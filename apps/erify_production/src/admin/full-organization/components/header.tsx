import type { useFullOrganization } from "@/admin/full-organization/hooks/use-full-organization";

import { Avatar, AvatarFallback, AvatarImage } from "@eridu/ui/components/avatar";
import { Badge } from "@eridu/ui/components/badge";
import { Button } from "@eridu/ui/components/button";
import { format } from "date-fns";
import { Calendar, Copy } from "lucide-react";
import { useCallback } from "react";

type Organization = NonNullable<ReturnType<typeof useFullOrganization>["data"]>;

type HeaderProps = { organization: Pick<Organization, "id" | "name" | "logo" | "slug" | "createdAt"> };

export const Header: React.FC<HeaderProps> = ({ organization }) => {
  const { id, name, slug, logo, createdAt } = organization;

  const onClick: React.MouseEventHandler<HTMLButtonElement>
   = useCallback(() => {
     navigator.clipboard.writeText(organization.id);
   }, [organization.id]);

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16 hidden sm:block">
        <AvatarImage src={logo || ""} alt={name} />
        <AvatarFallback className="text-2xl bg-primary/10">{name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col justify-center max-w-[calc(100vw-3rem)]">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">{name}</h1>
          <Badge variant="outline" className="ml-2">
            {slug}
          </Badge>
        </div>
        <div className="flex items-center text-muted-foreground text-sm mt-1 ">
          <span className="truncate">
            ID:
            {" "}
            {id}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClick}>
            <Copy className="h-3 w-3" />
            <span className="sr-only">Copy ID</span>
          </Button>
        </div>
        <div className="flex items-center text-muted-foreground text-sm mt-1">
          <Calendar className="h-4 w-4 mr-1" />
          Created on
          &nbsp;
          {format(new Date(createdAt), "MMMM d, yyyy")}
        </div>
      </div>
    </div>
  );
};

export default Header;
