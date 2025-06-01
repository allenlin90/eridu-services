import { Button } from "@eridu/ui/components/button";
import { Card, CardContent, CardHeader } from "@eridu/ui/components/card";
import { format } from "date-fns";
import { Calendar, Clock, Copy } from "lucide-react";
import { useCallback } from "react";

import type { ShowDetails } from "../shows/types/show-details";
import type { ShowMaterial } from "../shows/types/show-materials";

import { ShowMaterialsCollapsible } from "./show-materials-collapsible";

type ShowDetailsCardProps = {
  showDetails: ShowDetails;
  showMaterials?: ShowMaterial[];
};

export const ShowDetailsCard: React.FC<ShowDetailsCardProps> = (
  {
    showDetails,
    showMaterials,
  },
) => {
  const { client, studio_room, ...show } = showDetails;

  const copyId = useCallback(
    (show_uid: string) =>
      (_e: React.MouseEvent<HTMLButtonElement>) => {
        navigator.clipboard.writeText(show_uid);
      },
    [],
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold line-clamp-1 capitalize">{show.name}</h3>
            <div className="flex items-center">
              <p className="text-sm text-muted-foreground">
                ID:
                &nbsp;
                {show.id}
              </p>
              <Button variant="ghost" className="p-2" onClick={copyId(show.id)}>
                <Copy />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{format(show.start_time, "MMM d, yyyy")}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {format(show.start_time, "h:mm a")}
              &nbsp;-&nbsp;
              {format(show.end_time, "h:mm a")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground capitalize">Client:</span>
              &nbsp;
              {client?.name}
            </div>
          </div>
          {studio_room && (
            <div className="text-sm">
              <span className="text-muted-foreground">Studio:</span>
              &nbsp;
              {studio_room.name}
              &nbsp;
              (
              <span className="text-muted-foreground">
                {studio_room.id}
              </span>
              )
            </div>
          )}
        </div>
        <hr className="my-2" />
        <ShowMaterialsCollapsible showMaterials={showMaterials} />
      </CardContent>
    </Card>
  );
};

export default ShowDetailsCard;
