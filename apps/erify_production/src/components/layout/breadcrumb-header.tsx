import { ROUTES } from "@/constants/routes";
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

const isBreadcrumbLinkActive = (path: string) => {
  if (path === ROUTES.ERIFY.BASE)
    return false;

  return true;
};

const BreadcrumbMaterial = ({ path, segment, isFinal = false }: {
  path: string;
  segment: string;
  isFinal?: boolean;
}) => {
  const isPathActive = isBreadcrumbLinkActive(path);

  if (!isPathActive) {
    return <span className="capitalize">{segment}</span>;
  }

  if (isPathActive && !isFinal) {
    return (
      <BreadcrumbLink asChild>
        <Link to={path} className="capitalize">
          {segment}
        </Link>
      </BreadcrumbLink>
    );
  }

  return <BreadcrumbPage className="capitalize">{segment}</BreadcrumbPage>;
};

export const BreadcrumbHeader = () => {
  const { pathname } = useLocation();
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = `/${pathSegments.slice(0, index + 1).join("/")}`;
    const isFinal = index === pathSegments.length - 1;

    return (
      <Fragment key={path}>
        <BreadcrumbItem>
          <BreadcrumbMaterial
            path={path}
            isFinal={isFinal}
            segment={segment}
          />
        </BreadcrumbItem>
        {!isFinal && <BreadcrumbSeparator />}
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
