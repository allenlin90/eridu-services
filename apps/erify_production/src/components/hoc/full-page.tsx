import { cn } from "@eridu/ui/lib/utils";

export const FullPage = (
  Component: React.FC,
  { className, ...props }: React.ComponentProps<"div"> = {},
) => {
  const Wrapped: React.FC = (componentProps: React.ComponentProps<typeof Component>) => (
    <div className={cn("flex flex-1 flex-col", className ?? "")} {...props}>
      <Component {...componentProps} />
    </div>
  );

  Wrapped.displayName = "FullPage";

  return Wrapped;
};

export default FullPage;
