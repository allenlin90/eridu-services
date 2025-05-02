import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@eridu/ui/components/breadcrumb";
import { Link, useLocation } from "react-router";
import { Fragment } from "react/jsx-runtime";

export const BreadcrumbHeader = () => {
  const { pathname } = useLocation();
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = `/${pathSegments.slice(0, index + 1).join("/")}`;

    return (
      <Fragment key={path}>
        <BreadcrumbItem>
          {index < pathSegments.length - 1
            ? (
                <BreadcrumbLink asChild>
                  <Link to={path} className="capitalize">
                    {segment}
                  </Link>
                </BreadcrumbLink>
              )
            : <BreadcrumbPage className="capitalize">{segment}</BreadcrumbPage>}
        </BreadcrumbItem>
        {index < pathSegments.length - 1 && (
          <BreadcrumbSeparator />
        )}
      </Fragment>
    );
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
