import { cn } from "@eridu/ui/lib/utils";

type ImageProps = React.ComponentProps<"img">;

export const Image: React.FC<ImageProps> = ({ className, src, ...props }) => {
  if (!src)
    return null;

  return <img src={src} className={cn("object-cover", className)} {...props} />;
};

export default Image;
