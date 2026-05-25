import { createFileRoute, getRouteApi, Navigate } from '@tanstack/react-router';

const operationsReviewRouteApi = getRouteApi('/studios/$studioId/operations-review');

export const Route = createFileRoute('/studios/$studioId/operations-review/')({
  component: OperationsReviewIndexRoute,
});

function OperationsReviewIndexRoute() {
  const { studioId } = Route.useParams();
  const search = operationsReviewRouteApi.useSearch();

  return (
    <Navigate
      to="/studios/$studioId/operations-review/submissions"
      params={{ studioId }}
      search={search}
      replace
    />
  );
}
