import { createFileRoute } from '@tanstack/react-router';

import { ConsentPage } from '../pages/consent-page';

export const Route = createFileRoute('/consent')({
  component: ConsentPage,
});
