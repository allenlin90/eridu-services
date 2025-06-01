import type { LucideProps } from "lucide-react";

import { Button } from "@eridu/ui/components/button";
import { Card, CardContent, CardHeader } from "@eridu/ui/components/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@eridu/ui/components/collapsible";
import { cn } from "@eridu/ui/lib/utils";
import { ChevronRight, CircleDollarSign, FileText, ImageIcon, Layers } from "lucide-react";

import type { ShowMaterial } from "../shows/types/show-materials";

const getIcon = (type: string, { className, ...props }: LucideProps = {}) => {
  const size = "h-4 w-4";

  switch (type) {
    case "script":
      return <FileText className={cn(size, className)} {...props} />;
    case "scene":
      return <ImageIcon className={cn(size, className)} {...props} />;
    case "mechanic":
      return <CircleDollarSign className={cn(size, className)} {...props} />;
    case "obs_layer":
      return <Layers className={cn(size, className)} {...props} />;
    default:
      return <FileText className={cn(size, className)} {...props} />;
  }
};

type ShowMaterialsCollapsibleProps = {
  showMaterials?: ShowMaterial[];
};

export const ShowMaterialsCollapsible: React.FC<ShowMaterialsCollapsibleProps> = ({
  showMaterials,
}) => {
  if (!showMaterials)
    return null;

  return (
    <Collapsible className="group/collapsible flex flex-col gap-2">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full px-0">
          <span>Materials</span>
          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4">
        {showMaterials.map((material) => {
          return (
            <Card key={material.id}>
              <CardHeader className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {getIcon(material.type)}
                    <span className="capitalize font-medium">{material.type}</span>
                  </div>
                  {material.resource_url && (
                    <Button variant="outline" asChild>
                      <a
                        href={material.resource_url}
                        target="_blank"
                        referrerPolicy="no-referrer"
                      >
                        Open
                      </a>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-sm p-4 pt-0">
                <p>{material.name}</p>
                <p>{material.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
};
